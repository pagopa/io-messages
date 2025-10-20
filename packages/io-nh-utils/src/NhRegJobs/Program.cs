using Microsoft.Azure.NotificationHubs;
using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using Azure.Storage;
using System;
using System.Xml.Linq;
using System.Text;

static void Require(params (string key,string? val)[] kv)
{
    foreach (var (k,v) in kv)
        if (string.IsNullOrWhiteSpace(v)) throw new Exception($"Missing env var {k}");
}

static BlobServiceClient MakeBlobService()
{
    var BLOB_URL = Environment.GetEnvironmentVariable("BLOB_URL");
    var ACCOUNT_NAME = Environment.GetEnvironmentVariable("ACCOUNT_NAME");
    var ACCOUNT_KEY = Environment.GetEnvironmentVariable("ACCOUNT_KEY");
    Require((nameof(BLOB_URL),BLOB_URL),(nameof(ACCOUNT_NAME),ACCOUNT_NAME),(nameof(ACCOUNT_KEY),ACCOUNT_KEY));
    return new BlobServiceClient(
        new Uri(BLOB_URL!),
        new StorageSharedKeyCredential(ACCOUNT_NAME!, ACCOUNT_KEY!)
    );
}

static Uri MakeContainerSasUri(string containerName, BlobContainerSasPermissions perms, TimeSpan ttl)
{
    var svc = MakeBlobService();
    var container = svc.GetBlobContainerClient(containerName);
    return container.GenerateSasUri(perms, DateTimeOffset.UtcNow.Add(ttl));
}

static async Task<NotificationHubJob> RunAndWaitAsync(NotificationHubClient client, NotificationHubJob job)
{
    var created = await client.SubmitNotificationHubJobAsync(job);
    var id = created.JobId!;
    while (true)
    {
        await Task.Delay(TimeSpan.FromSeconds(5));
        var cur = await client.GetNotificationHubJobAsync(id);
        Console.WriteLine($"Job {id}: {cur.Status} ({cur.Progress}%)");
        if (cur.Status is NotificationHubJobStatus.Completed or NotificationHubJobStatus.Failed) return cur;
    }
}

var cmd = args.Length > 0 ? args[0] : "help";
if (cmd is "help")
{
    Console.WriteLine("Commands:\n  export\n  import");
    Environment.Exit(0);
}

if (cmd is "export")
{
    var FROM_CONN = Environment.GetEnvironmentVariable("FROM_CONN");
    var FROM_HUB  = Environment.GetEnvironmentVariable("FROM_HUB");
    var CONTAINER_NAME = Environment.GetEnvironmentVariable("CONTAINER_NAME");
    Require((nameof(FROM_CONN),FROM_CONN),(nameof(FROM_HUB),FROM_HUB),(nameof(CONTAINER_NAME),CONTAINER_NAME));

    var outputContainerSas = MakeContainerSasUri(CONTAINER_NAME!, BlobContainerSasPermissions.Read|BlobContainerSasPermissions.List|BlobContainerSasPermissions.Create|BlobContainerSasPermissions.Write, TimeSpan.FromHours(2));

    var client = NotificationHubClient.CreateClientFromConnectionString(FROM_CONN!, FROM_HUB!);
    var job = new NotificationHubJob
    {
        JobType = NotificationHubJobType.ExportRegistrations,
        OutputContainerUri = outputContainerSas
    };

    var done = await RunAndWaitAsync(client, job);
    Console.WriteLine(done.Status == NotificationHubJobStatus.Completed ? "Export completed." : $"Export failed. {done.Failure}");
}
else
{
    Console.Error.WriteLine("Unknown command.");
    Environment.Exit(1);
}

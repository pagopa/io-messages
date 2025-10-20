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

static Uri MakeBlobSasUri(string containerName, string blobName, BlobSasPermissions perms, TimeSpan ttl)
{
    var svc = MakeBlobService();
    var blob = svc.GetBlobContainerClient(containerName).GetBlobClient(blobName);
    return blob.GenerateSasUri(perms, DateTimeOffset.UtcNow.Add(ttl));
}

static string CleanRegistrationXml(string line, bool createMode)
{
    if (string.IsNullOrWhiteSpace(line)) return line;

    var x = XDocument.Parse(line, LoadOptions.PreserveWhitespace);
    XNamespace ns = "http://schemas.microsoft.com/netservices/2010/10/servicebus/connect";
    XNamespace xsi = "http://www.w3.org/2001/XMLSchema-instance";

    foreach (var exp in x.Descendants(ns + "ExpirationTime").ToList())
        exp.Remove();

    if (createMode)
    {
        var regId = x.Descendants(ns + "RegistrationId").FirstOrDefault();
        if (regId != null)
        {
            regId.RemoveNodes();
            regId.SetAttributeValue(xsi + "nil", "true");
        }
    }

    return x.Root!.ToString(SaveOptions.DisableFormatting);
}

static async Task<Uri> CleanAndUploadAsync(
    string containerName,
    string srcBlobName,
    string dstBlobName,
    TimeSpan readSasTtl)
{
    var svc = MakeBlobService();
    var container = svc.GetBlobContainerClient(containerName);
    var src = container.GetBlobClient(srcBlobName);
    var dst = container.GetBlobClient(dstBlobName);

    await using var srcStream = await src.OpenReadAsync();
    using var sr = new StreamReader(srcStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
    using var ms = new MemoryStream();
    await using (var sw = new StreamWriter(ms, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false), leaveOpen: true))
    {
        while (!sr.EndOfStream)
        {
            var line = await sr.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(line)) continue;
            var cleaned = CleanRegistrationXml(line!, true);
            await sw.WriteLineAsync(cleaned);
        }
    }
    ms.Position = 0;
    await dst.UploadAsync(ms, overwrite: true);

    return dst.GenerateSasUri(BlobSasPermissions.All, DateTimeOffset.UtcNow.Add(readSasTtl));
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

# IO Functions Push Notification

This Azure Function Project manages all the aspects related to the Push Notifications.

It uses the Azure Notification Hub to enable the push notifications and the device management.

## Start locally

```shell
cp local.settings.json.example local.settings.json
yarn install

#if you are using devContainer than execute this command before yarn extensions:install
export FUNCTIONS_WORKER_RUNTIME=node

#requires .net installed on your machine. Tested with v8.0 and 9.0
yarn build
yarn start
```

## Environment variables

Those are all Environment variables needed by the application:

| Variable name                  | Description                                                                                  | type   | Required |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ------ | -------- |
| SLOT_TASK_HUBNAME              | The unique slot task hubname                                                                 | string | true     |
| APPINSIGHTS_INSTRUMENTATIONKEY | A valid Application Insights instrumentation key                                             | string | true     |
| STORAGE_CONN_STRING            | The connection string of the Storage Account                                                 | string | true     |
| NOTIFICATIONS_QUEUE_NAME       | The name of the queue that stores the Notification messages                                  | string | true     |
| NH_PARTITION_FEATURE_FLAG      | The type of FF enabled fot NH partition. Possible values: "none" - "all" - "beta" - "canary" | string | true     |

### Notification Hubs

| Variable name       | Description                                                                            | type   | Required |
| ------------------- | -------------------------------------------------------------------------------------- | ------ | -------- |
| NH1_ENDPOINT        | The endpoint of the first namespace of Notification Hub                                | string | true     |
| NH1_NAME            | The name of the Notification Hub in the first namespace                                | string | true     |
| NH1_PARTITION_REGEX | The regex which defines the user subset associated with the first namespace Namespace  | string | true     |
| NH2_ENDPOINT        | The endpoint of the second namespace of Notification Hub                               | string | true     |
| NH2_NAME            | The name of the Notification Hub in the second namespace                               | string | true     |
| NH2_PARTITION_REGEX | The regex which defines the user subset associated with the second namespace Namespace | string | true     |
| NH3_ENDPOINT        | The endpoint of the third namespace of Notification Hub                                | string | true     |
| NH3_NAME            | The name of the Notification Hub in the third namespace                                | string | true     |
| NH3_PARTITION_REGEX | The regex which defines the user subset associated with the third namespace Namespace  | string | true     |
| NH4_ENDPOINT        | The endpoint of the forth namespace of Notification Hub                                | string | true     |
| NH4_NAME            | The name of the Notification Hub in the forth namespace                                | string | true     |
| NH4_PARTITION_REGEX | The regex which defines the user subset associated with the forth namespace Namespace  | string | true     |

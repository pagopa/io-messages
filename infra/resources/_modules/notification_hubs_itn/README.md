# notification_hubs_itn

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | n/a |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_metric_alert.alert_nh_partitions_anomalous_pns_success_volume](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_partitions_pns_errors](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_notification_hub.partition_1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.partition_2](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.partition_3](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.partition_4](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.sandbox](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub_authorization_rule.partition_1_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.partition_1_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.partition_2_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.partition_2_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.partition_3_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.partition_3_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.partition_4_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.partition_4_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.sandbox_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.sandbox_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_namespace.partition_1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.partition_2](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.partition_3](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.partition_4](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.sandbox](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_role_assignment.com_devs_notification_hub_partition_1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.com_devs_notification_hub_partition_2](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.com_devs_notification_hub_partition_3](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.com_devs_notification_hub_partition_4](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_key_vault_secret.notification_hub_dev_api_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.notification_hub_dev_token](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.notification_hub_prod_api_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.notification_hub_prod_token](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | n/a | `string` | n/a | yes |
| <a name="input_adgroup_com_devs_id"></a> [adgroup\_com\_devs\_id](#input\_adgroup\_com\_devs\_id) | n/a | `string` | n/a | yes |
| <a name="input_domain"></a> [domain](#input\_domain) | n/a | `string` | n/a | yes |
| <a name="input_key_vault_common_id"></a> [key\_vault\_common\_id](#input\_key\_vault\_common\_id) | n/a | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | n/a | `string` | n/a | yes |
| <a name="input_location_short"></a> [location\_short](#input\_location\_short) | n/a | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | n/a | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | n/a | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | n/a | `map(string)` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->

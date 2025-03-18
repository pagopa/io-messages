# notification_hubs

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.17.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_metric_alert.alert_nh_common_anomalous_pns_success_volume](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_common_partition_1_anomalous_pns_success_volume](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_common_partition_1_pns_errors](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_common_partition_2_anomalous_pns_success_volume](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_common_partition_2_pns_errors](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_common_partition_3_anomalous_pns_success_volume](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_common_partition_3_pns_errors](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_common_partition_4_anomalous_pns_success_volume](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_common_partition_4_pns_errors](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.alert_nh_common_pns_errors](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_notification_hub.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.common01](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.common_partition_1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.common_partition_2](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.common_partition_3](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.common_partition_4](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.sandbox](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub.sandbox_partition_1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub) | resource |
| [azurerm_notification_hub_authorization_rule.common_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.common_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.common_partition_1_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.common_partition_1_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.common_partition_2_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.common_partition_2_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.common_partition_3_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.common_partition_3_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.common_partition_4_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.common_partition_4_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.sandbox_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.sandbox_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.sandbox_partition_1_default_full](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_authorization_rule.sandbox_partition_1_default_listen](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule) | resource |
| [azurerm_notification_hub_namespace.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.common_partition_1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.common_partition_2](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.common_partition_3](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.common_partition_4](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.sandbox](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_notification_hub_namespace.sandbox_partition_1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace) | resource |
| [azurerm_key_vault_secret.ntfns_common_ntf_common_api_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.ntfns_common_ntf_common_api_key_sandbox](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.ntfns_common_ntf_common_token](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.ntfns_common_ntf_common_token_sandbox](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | n/a | `string` | n/a | yes |
| <a name="input_key_vault_common_id"></a> [key\_vault\_common\_id](#input\_key\_vault\_common\_id) | n/a | `string` | n/a | yes |
| <a name="input_legacy_resource_group_name"></a> [legacy\_resource\_group\_name](#input\_legacy\_resource\_group\_name) | n/a | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | n/a | `string` | n/a | yes |
| <a name="input_location_short"></a> [location\_short](#input\_location\_short) | n/a | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | n/a | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | n/a | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | n/a | `map(string)` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->

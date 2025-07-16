# web_apps

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.17.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_citizen_func"></a> [citizen\_func](#module\_citizen\_func) | pagopa-dx/azure-function-app/azurerm | ~> 0.0 |
| <a name="module_citizen_func_autoscaler"></a> [citizen\_func\_autoscaler](#module\_citizen\_func\_autoscaler) | pagopa-dx/azure-app-service-plan-autoscaler/azurerm | ~> 1.0 |
| <a name="module_cqrs_func"></a> [cqrs\_func](#module\_cqrs\_func) | pagopa-dx/azure-function-app/azurerm | ~> 1.0 |
| <a name="module_cqrs_func_autoscaler"></a> [cqrs\_func\_autoscaler](#module\_cqrs\_func\_autoscaler) | pagopa-dx/azure-app-service-plan-autoscaler/azurerm | ~> 1.0 |
| <a name="module_etl_func"></a> [etl\_func](#module\_etl\_func) | pagopa-dx/azure-function-app/azurerm | ~> 0.0 |
| <a name="module_etl_func_autoscaler"></a> [etl\_func\_autoscaler](#module\_etl\_func\_autoscaler) | pagopa-dx/azure-app-service-plan-autoscaler/azurerm | ~> 1.0 |
| <a name="module_ops_func"></a> [ops\_func](#module\_ops\_func) | pagopa-dx/azure-function-app/azurerm | ~> 0.0 |
| <a name="module_push_notif_autoscaler"></a> [push\_notif\_autoscaler](#module\_push\_notif\_autoscaler) | pagopa-dx/azure-app-service-plan-autoscaler/azurerm | ~> 1.0 |
| <a name="module_push_notif_function"></a> [push\_notif\_function](#module\_push\_notif\_function) | pagopa-dx/azure-function-app/azurerm | ~> 0.0 |
| <a name="module_remote_content_func"></a> [remote\_content\_func](#module\_remote\_content\_func) | pagopa-dx/azure-function-app/azurerm | ~> 0.0 |
| <a name="module_remote_content_func_autoscaler"></a> [remote\_content\_func\_autoscaler](#module\_remote\_content\_func\_autoscaler) | pagopa-dx/azure-app-service-plan-autoscaler/azurerm | ~> 1.0 |
| <a name="module_services_func"></a> [services\_func](#module\_services\_func) | pagopa-dx/azure-function-app/azurerm | ~> 1.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_cosmosdb_sql_role_assignment.citizen_func_api](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.citizen_func_com](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.cosmos_api_cqrs_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.cosmosdb_account_api](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.etl_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.io_com_cosmos](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.io_com_cosmos_etl_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.ops_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.ops_func_slot](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.services_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_key_vault_access_policy.etl_func_kv_access_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_redis_cache_access_policy_assignment.etl_func_redis_access_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache_access_policy_assignment) | resource |
| [azurerm_role_assignment.citizen_func_cosmosdb_account_api](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.citizen_func_io_com_cosmos](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.com_st](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.eventhub_namespace_write](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.io_com_cosmos_etl_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.io_com_cosmos_ops_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.io_com_cosmos_ops_func_slot](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.key_vault_etl_func_secrets_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.message_content_container_contributor_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.message_content_container_read](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.ops_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.ops_func_slot](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.remote_content_cosmosdb_account_api](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.remote_content_io_com_cosmos](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.remote_content_key_vault_secrets_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.remote_content_slot_key_vault_secrets_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.services_cosmosdb_account_api](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.services_func_com_st_blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.services_func_com_st_blob_slot](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.services_func_com_st_queue](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.services_func_com_st_queue_slot](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.services_func_stapi_container_read](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.services_func_stapi_container_read_slot](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.services_key_vault_secrets_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.services_slot_key_vault_secrets_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_subnet_nat_gateway_association.functions_messages_citizen_subnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_nat_gateway_association) | resource |
| [azurerm_subnet_nat_gateway_association.net_gateway_association_subnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_nat_gateway_association) | resource |
| [azurerm_subnet_nat_gateway_association.services_func_subnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_nat_gateway_association) | resource |
| [azurerm_eventhub_authorization_rule.cqrs_message_evh](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/eventhub_authorization_rule) | data source |
| [azurerm_eventhub_authorization_rule.cqrs_message_status_evh](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/eventhub_authorization_rule) | data source |
| [azurerm_key_vault.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |
| [azurerm_key_vault_secret.azure_nh_endpoint](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.azure_nh_partition1_endpoint](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.azure_nh_partition2_endpoint](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.azure_nh_partition3_endpoint](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.azure_nh_partition4_endpoint](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_monitor_action_group.io_com_action_group](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/monitor_action_group) | data source |
| [azurerm_nat_gateway.nat_gateway](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/nat_gateway) | data source |
| [azurerm_notification_hub.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/notification_hub) | data source |
| [azurerm_notification_hub.common_partition](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/notification_hub) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | The ID of the action group | `string` | n/a | yes |
| <a name="input_app_settings"></a> [app\_settings](#input\_app\_settings) | n/a | <pre>object({<br/>    message_error_table_storage_uri = string,<br/>    eventhub_connection_uri         = string,<br/>  })</pre> | n/a | yes |
| <a name="input_application_insights"></a> [application\_insights](#input\_application\_insights) | n/a | <pre>object({<br/>    connection_string   = string<br/>    instrumentation_key = string<br/>    sampling_percentage = number<br/>  })</pre> | n/a | yes |
| <a name="input_com_st_connectiostring"></a> [com\_st\_connectiostring](#input\_com\_st\_connectiostring) | n/a | `string` | n/a | yes |
| <a name="input_com_st_id"></a> [com\_st\_id](#input\_com\_st\_id) | n/a | `string` | n/a | yes |
| <a name="input_com_st_queue_uri"></a> [com\_st\_queue\_uri](#input\_com\_st\_queue\_uri) | n/a | `string` | n/a | yes |
| <a name="input_com_st_uri"></a> [com\_st\_uri](#input\_com\_st\_uri) | n/a | `string` | n/a | yes |
| <a name="input_common_key_vault"></a> [common\_key\_vault](#input\_common\_key\_vault) | n/a | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_cosmosdb_account_api"></a> [cosmosdb\_account\_api](#input\_cosmosdb\_account\_api) | n/a | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    endpoint            = string<br/>    primary_key         = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_cqrs_func_ehns_enabled"></a> [cqrs\_func\_ehns\_enabled](#input\_cqrs\_func\_ehns\_enabled) | Enable the Event Hub Namespace for the CQRS function | `bool` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix    = string<br/>    env_short = string<br/>    location  = string<br/>    domain    = string<br/>  })</pre> | n/a | yes |
| <a name="input_eventhub_namespace"></a> [eventhub\_namespace](#input\_eventhub\_namespace) | n/a | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_io_com_cosmos"></a> [io\_com\_cosmos](#input\_io\_com\_cosmos) | n/a | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    endpoint            = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | n/a | <pre>object({<br/>    name = string<br/>    id   = string<br/>  })</pre> | n/a | yes |
| <a name="input_message_content_storage"></a> [message\_content\_storage](#input\_message\_content\_storage) | n/a | <pre>object({<br/>    endpoint          = string<br/>    connection_string = string<br/>  })</pre> | n/a | yes |
| <a name="input_messages_content_container"></a> [messages\_content\_container](#input\_messages\_content\_container) | n/a | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_messages_storage_account"></a> [messages\_storage\_account](#input\_messages\_storage\_account) | n/a | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_nat_gateway_id"></a> [nat\_gateway\_id](#input\_nat\_gateway\_id) | The ID of the NAT Gateway | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Resource group name of the private DNS zone to use for private endpoints | `string` | n/a | yes |
| <a name="input_redis_cache"></a> [redis\_cache](#input\_redis\_cache) | n/a | <pre>object({<br/>    id         = string<br/>    hostname   = string<br/>    port       = string<br/>    access_key = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_session_manager_base_url"></a> [session\_manager\_base\_url](#input\_session\_manager\_base\_url) | n/a | `string` | n/a | yes |
| <a name="input_subnet_cidrs"></a> [subnet\_cidrs](#input\_subnet\_cidrs) | n/a | <pre>object({<br/>    citizen_func        = string<br/>    etl_func            = string<br/>    ops_func            = string<br/>    push_notif_func     = string<br/>    cqrs_func           = string<br/>    services_func       = string<br/>    remote_content_func = string<br/>  })</pre> | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | n/a | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tenant_id"></a> [tenant\_id](#input\_tenant\_id) | n/a | `string` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | n/a | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_etl_func"></a> [etl\_func](#output\_etl\_func) | n/a |
| <a name="output_remote_content_func"></a> [remote\_content\_func](#output\_remote\_content\_func) | n/a |
<!-- END_TF_DOCS -->

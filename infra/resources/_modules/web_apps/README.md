# web_apps

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.16.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_etl_func"></a> [etl\_func](#module\_etl\_func) | pagopa/dx-azure-function-app/azurerm | ~>0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_cosmosdb_sql_role_assignment.etl_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_key_vault_access_policy.etl_func_kv_access_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_redis_cache_access_policy_assignment.etl_func_redis_access_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache_access_policy_assignment) | resource |
| [azurerm_role_assignment.eventhub_namespace_write](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.key_vault_etl_func_secrets_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.message_content_container_read](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.messages_error_table](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | The ID of the action group | `string` | n/a | yes |
| <a name="input_app_settings"></a> [app\_settings](#input\_app\_settings) | n/a | <pre>object({<br/>    message_content_storage_uri : string,<br/>    message_error_table_starage_uri : string,<br/>    eventhub_connection_uri : string,<br/>  })</pre> | n/a | yes |
| <a name="input_application_insights"></a> [application\_insights](#input\_application\_insights) | n/a | <pre>object({<br/>    connection_string = string<br/>  })</pre> | n/a | yes |
| <a name="input_common_key_vault"></a> [common\_key\_vault](#input\_common\_key\_vault) | n/a | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_cosmosdb_account_api"></a> [cosmosdb\_account\_api](#input\_cosmosdb\_account\_api) | n/a | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    endpoint            = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix    = string<br/>    env_short = string<br/>    location  = string<br/>    domain    = string<br/>  })</pre> | n/a | yes |
| <a name="input_eventhub_namespace"></a> [eventhub\_namespace](#input\_eventhub\_namespace) | n/a | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_messages_content_container"></a> [messages\_content\_container](#input\_messages\_content\_container) | n/a | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_messages_error_table_storage_account"></a> [messages\_error\_table\_storage\_account](#input\_messages\_error\_table\_storage\_account) | n/a | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_messages_storage_account"></a> [messages\_storage\_account](#input\_messages\_storage\_account) | n/a | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Resource group name of the private DNS zone to use for private endpoints | `string` | n/a | yes |
| <a name="input_redis_cache"></a> [redis\_cache](#input\_redis\_cache) | n/a | <pre>object({<br/>    id         = string<br/>    url        = string<br/>    access_key = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_subnet_cidrs"></a> [subnet\_cidrs](#input\_subnet\_cidrs) | n/a | <pre>object({<br/>    notif_func = string<br/>  })</pre> | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | n/a | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tenant_id"></a> [tenant\_id](#input\_tenant\_id) | n/a | `string` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | n/a | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_etl_func"></a> [etl\_func](#output\_etl\_func) | n/a |
<!-- END_TF_DOCS -->

# function_app_sending

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
| <a name="module_function_app_messages_sending"></a> [function\_app\_messages\_sending](#module\_function\_app\_messages\_sending) | pagopa-dx/azure-function-app/azurerm | ~> 0.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_cosmosdb_sql_role_assignment.cosmosdb_api](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_sql_role_assignment.cosmosdb_com](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_role_assignment.key_vault_sending_func_secrets_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.key_vault_sending_func_slot_secrets_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.sending_cosmosdb_api](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.sending_cosmosdb_com](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_subnet_nat_gateway_association.net_gateway_association_subnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_nat_gateway_association) | resource |
| [azurerm_nat_gateway.nat_gateway](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/nat_gateway) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | The ID of the action group | `string` | n/a | yes |
| <a name="input_ai_connection_string"></a> [ai\_connection\_string](#input\_ai\_connection\_string) | The connection string to connect to application insights | `string` | n/a | yes |
| <a name="input_ai_sampling_percentage"></a> [ai\_sampling\_percentage](#input\_ai\_sampling\_percentage) | The sampling percentage for application insights | `string` | n/a | yes |
| <a name="input_appbackendli_token"></a> [appbackendli\_token](#input\_appbackendli\_token) | Token to access appbackendli | `string` | n/a | yes |
| <a name="input_cidr_subnet_messages_sending_func"></a> [cidr\_subnet\_messages\_sending\_func](#input\_cidr\_subnet\_messages\_sending\_func) | CIDR block for messages sending function app subnet | `string` | n/a | yes |
| <a name="input_com_st_connectiostring"></a> [com\_st\_connectiostring](#input\_com\_st\_connectiostring) | COM storage account connection string | `string` | n/a | yes |
| <a name="input_cosmosdb_api"></a> [cosmosdb\_api](#input\_cosmosdb\_api) | REPO DEFINED VARIABLES | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    endpoint            = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_cosmosdb_com"></a> [cosmosdb\_com](#input\_cosmosdb\_com) | n/a | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    endpoint            = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_domain"></a> [domain](#input\_domain) | Domain | `string` | n/a | yes |
| <a name="input_env_short"></a> [env\_short](#input\_env\_short) | Short environment | `string` | n/a | yes |
| <a name="input_internal_user_id"></a> [internal\_user\_id](#input\_internal\_user\_id) | Internal user to bypass | `string` | n/a | yes |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | n/a | <pre>object({<br/>    name = string<br/>    id   = string<br/>  })</pre> | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | Azure region | `string` | n/a | yes |
| <a name="input_message_storage_account_blob_connection_string"></a> [message\_storage\_account\_blob\_connection\_string](#input\_message\_storage\_account\_blob\_connection\_string) | Connection string to connect to message storage account | `string` | n/a | yes |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | IO Prefix | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Resource group name of the private DNS zone to use for private endpoints | `string` | n/a | yes |
| <a name="input_private_endpoint_subnet_id"></a> [private\_endpoint\_subnet\_id](#input\_private\_endpoint\_subnet\_id) | Private Endpoints subnet Id | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | IO prefix and short environment | `string` | n/a | yes |
| <a name="input_redis_password"></a> [redis\_password](#input\_redis\_password) | Redis password | `string` | n/a | yes |
| <a name="input_redis_port"></a> [redis\_port](#input\_redis\_port) | Redis port | `string` | n/a | yes |
| <a name="input_redis_url"></a> [redis\_url](#input\_redis\_url) | Redis url | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be created | `string` | n/a | yes |
| <a name="input_session_manager_base_url"></a> [session\_manager\_base\_url](#input\_session\_manager\_base\_url) | n/a | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network to create subnet in | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_function_app_messages_sending"></a> [function\_app\_messages\_sending](#output\_function\_app\_messages\_sending) | n/a |
<!-- END_TF_DOCS -->

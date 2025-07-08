# mongo

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | n/a |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_mongdb_collection_payment_retry"></a> [mongdb\_collection\_payment\_retry](#module\_mongdb\_collection\_payment\_retry) | git::https://github.com/pagopa/terraform-azurerm-v4.git//cosmosdb_mongodb_collection | v7.13.0 |
| <a name="module_mongdb_collection_payment_sharded"></a> [mongdb\_collection\_payment\_sharded](#module\_mongdb\_collection\_payment\_sharded) | git::https://github.com/pagopa/terraform-azurerm-v4.git//cosmosdb_mongodb_collection | v7.13.0 |
| <a name="module_mongdb_collection_reminder_sharded"></a> [mongdb\_collection\_reminder\_sharded](#module\_mongdb\_collection\_reminder\_sharded) | github.com/pagopa/terraform-azurerm-v4//cosmosdb_mongodb_collection | v7.13.0 |
| <a name="module_payments_cosmos_account"></a> [payments\_cosmos\_account](#module\_payments\_cosmos\_account) | git::https://github.com/pagopa/terraform-azurerm-v4.git//cosmosdb_account | v7.13.0 |
| <a name="module_reminder_cosmos_account"></a> [reminder\_cosmos\_account](#module\_reminder\_cosmos\_account) | github.com/pagopa/terraform-azurerm-v4//cosmosdb_account | v7.13.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_cosmosdb_mongo_database.db_payments](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_mongo_database) | resource |
| [azurerm_cosmosdb_mongo_database.db_reminder](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_mongo_database) | resource |
| [azurerm_key_vault_secret.mongodb_payments_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_key_vault_secret.mongodb_reminder_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_private_endpoint.payments_cosmos_account](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.reminder_cosmos_account](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_dns_zone.privatelink_mongo_cosmos_azure_com](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_subnet.private_endpoints_subnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | n/a | <pre>object({<br/>    prefix      = string,<br/>    environment = string,<br/>    location    = string,<br/>    domain      = string<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault_id"></a> [key\_vault\_id](#input\_key\_vault\_id) | Id of the team domain key vault | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | n/a | `string` | n/a | yes |
| <a name="input_secondary_geo_location"></a> [secondary\_geo\_location](#input\_secondary\_geo\_location) | Secondary geo location for the CosmosDB account | `string` | `"spaincentral"` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | ID of the subnet where the private endpoint will be created | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | n/a | `map(string)` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->

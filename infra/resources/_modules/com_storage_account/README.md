# com_storage_account

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.19.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_dx-azure-storage-account"></a> [dx-azure-storage-account](#module\_dx-azure-storage-account) | pagopa/dx-azure-storage-account/azurerm | 0.0.9 |

## Resources

| Name | Type |
|------|------|
| [azurerm_storage_table.messages_ingestion_error](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_table) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | n/a | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | n/a | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | n/a | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | n/a | `map(string)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_messages_error_table_storage_account_uri"></a> [messages\_error\_table\_storage\_account\_uri](#output\_messages\_error\_table\_storage\_account\_uri) | n/a |
<!-- END_TF_DOCS -->

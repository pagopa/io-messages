# eventhubs

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

No providers.

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_etl"></a> [etl](#module\_etl) | pagopa/dx-azure-event-hub/azurerm | ~>0 |

## Resources

No resources.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_domain"></a> [domain](#input\_domain) | domain used to create resource naming | `string` | n/a | yes |
| <a name="input_env_short"></a> [env\_short](#input\_env\_short) | env\_short used to create resource naming | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | location used to create resource naming | `string` | n/a | yes |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | prefix used to create resource naming | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Name of the private dns zone resource group name | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | subnet id | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->

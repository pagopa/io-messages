# function_app_citizen

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
| <a name="module_function_app_messages_citizen"></a> [function\_app\_messages\_citizen](#module\_function\_app\_messages\_citizen) | pagopa/dx-azure-function-app/azurerm | ~>0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_subnet_nat_gateway_association.functions_messages_citizen_subnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_nat_gateway_association) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | The ID of the action group | `string` | n/a | yes |
| <a name="input_ai_connection_string"></a> [ai\_connection\_string](#input\_ai\_connection\_string) | The connection string to connect to application insights | `string` | n/a | yes |
| <a name="input_ai_instrumentation_key"></a> [ai\_instrumentation\_key](#input\_ai\_instrumentation\_key) | The key to connect to application insights | `string` | n/a | yes |
| <a name="input_ai_sampling_percentage"></a> [ai\_sampling\_percentage](#input\_ai\_sampling\_percentage) | The sampling percentage for application insights | `string` | n/a | yes |
| <a name="input_cidr_subnet_messages_citizen_func"></a> [cidr\_subnet\_messages\_citizen\_func](#input\_cidr\_subnet\_messages\_citizen\_func) | CIDR block for messages citizen function app subnet | `string` | n/a | yes |
| <a name="input_cosmos_db_api_endpoint"></a> [cosmos\_db\_api\_endpoint](#input\_cosmos\_db\_api\_endpoint) | Cosmos DB endpoint to use as application environment variable | `string` | n/a | yes |
| <a name="input_cosmos_db_api_key"></a> [cosmos\_db\_api\_key](#input\_cosmos\_db\_api\_key) | Cosmos DB api key | `string` | n/a | yes |
| <a name="input_domain"></a> [domain](#input\_domain) | Domain | `string` | n/a | yes |
| <a name="input_env_short"></a> [env\_short](#input\_env\_short) | Short environment | `string` | n/a | yes |
| <a name="input_ff_beta_tester_list"></a> [ff\_beta\_tester\_list](#input\_ff\_beta\_tester\_list) | Specify the list of beta testers fiscal codes hashes | `string` | n/a | yes |
| <a name="input_ff_canary_users_regex"></a> [ff\_canary\_users\_regex](#input\_ff\_canary\_users\_regex) | Specify a regex to match some hashes of production users fiscal codes | `string` | n/a | yes |
| <a name="input_ff_type"></a> [ff\_type](#input\_ff\_type) | Specify the type for the feature flag to go for beta testers, canary regex or production users | `string` | n/a | yes |
| <a name="input_instance_number"></a> [instance\_number](#input\_instance\_number) | The index that counts levels of this functions app | `string` | n/a | yes |
| <a name="input_io_com_cosmos_endpoint"></a> [io\_com\_cosmos\_endpoint](#input\_io\_com\_cosmos\_endpoint) | Cosmos DB endpoint to use as application environment variable | `string` | n/a | yes |
| <a name="input_io_com_cosmos_key"></a> [io\_com\_cosmos\_key](#input\_io\_com\_cosmos\_key) | Cosmos DB api key | `string` | n/a | yes |
| <a name="input_io_receipt_remote_config_id"></a> [io\_receipt\_remote\_config\_id](#input\_io\_receipt\_remote\_config\_id) | The Remote Content Config ID of io-receipt service | `string` | `"01HMVM9W74RWH93NT1EYNKKNNR"` | no |
| <a name="input_io_receipt_remote_config_test_id"></a> [io\_receipt\_remote\_config\_test\_id](#input\_io\_receipt\_remote\_config\_test\_id) | The Remote Content Config ID of io-receipt service | `string` | `"01HMVMCDD3JFYTPKT4ZN4WQ73B"` | no |
| <a name="input_io_receipt_service_id"></a> [io\_receipt\_service\_id](#input\_io\_receipt\_service\_id) | The Service ID of io-receipt service | `string` | `"01HD63674XJ1R6XCNHH24PCRR2"` | no |
| <a name="input_io_receipt_service_test_id"></a> [io\_receipt\_service\_test\_id](#input\_io\_receipt\_service\_test\_id) | The Service ID of io-receipt service | `string` | `"01H4ZJ62C1CPGJ0PX8Q1BP7FAB"` | no |
| <a name="input_io_sign_remote_config_id"></a> [io\_sign\_remote\_config\_id](#input\_io\_sign\_remote\_config\_id) | The Remote Content Config ID of io-sign service | `string` | `"01HMVMDTHXCESMZ72NA701EKGQ"` | no |
| <a name="input_io_sign_service_id"></a> [io\_sign\_service\_id](#input\_io\_sign\_service\_id) | The Service ID of io-sign service | `string` | `"01GQQZ9HF5GAPRVKJM1VDAVFHM"` | no |
| <a name="input_location"></a> [location](#input\_location) | Azure region | `string` | n/a | yes |
| <a name="input_message_storage_account_blob_connection_string"></a> [message\_storage\_account\_blob\_connection\_string](#input\_message\_storage\_account\_blob\_connection\_string) | Connection string to connect to message storage account | `string` | n/a | yes |
| <a name="input_nat_gateway_id"></a> [nat\_gateway\_id](#input\_nat\_gateway\_id) | The ID of the NAT Gateway | `string` | n/a | yes |
| <a name="input_pn_remote_config_id"></a> [pn\_remote\_config\_id](#input\_pn\_remote\_config\_id) | The Remote Content Config ID of PN service | `string` | `"01HMVMHCZZ8D0VTFWMRHBM5D6F"` | no |
| <a name="input_pn_service_id"></a> [pn\_service\_id](#input\_pn\_service\_id) | The Service ID of PN service | `string` | `"01G40DWQGKY5GRWSNM4303VNRP"` | no |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | IO Prefix | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Resource group name of the private DNS zone to use for private endpoints | `string` | n/a | yes |
| <a name="input_private_endpoint_subnet_id"></a> [private\_endpoint\_subnet\_id](#input\_private\_endpoint\_subnet\_id) | Private Endpoints subnet Id | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | IO prefix and short environment | `string` | n/a | yes |
| <a name="input_redis_password"></a> [redis\_password](#input\_redis\_password) | Redis password | `string` | n/a | yes |
| <a name="input_redis_port"></a> [redis\_port](#input\_redis\_port) | Redis port | `string` | n/a | yes |
| <a name="input_redis_url"></a> [redis\_url](#input\_redis\_url) | Redis url | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be created | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |
| <a name="input_third_party_mock_remote_config_id"></a> [third\_party\_mock\_remote\_config\_id](#input\_third\_party\_mock\_remote\_config\_id) | The Remote Content Config ID of the Third Party Mock service | `string` | `"01HMVM4N4XFJ8VBR1FXYFZ9QFB"` | no |
| <a name="input_third_party_mock_service_id"></a> [third\_party\_mock\_service\_id](#input\_third\_party\_mock\_service\_id) | The Service ID of the Third Party Mock service | `string` | `"01GQQDPM127KFGG6T3660D5TXD"` | no |
| <a name="input_use_fallback"></a> [use\_fallback](#input\_use\_fallback) | Wheter to use fallback to composition or not | `bool` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network to create subnet in | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_function_app_messages_citizen"></a> [function\_app\_messages\_citizen](#output\_function\_app\_messages\_citizen) | n/a |
<!-- END_TF_DOCS -->

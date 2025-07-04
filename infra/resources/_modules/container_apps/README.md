# container_apps

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.35.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_com_cae"></a> [com\_cae](#module\_com\_cae) | pagopa-dx/azure-container-app-environment/azurerm | ~> 1.0 |
| <a name="module_payment_updater_ca_itn_01"></a> [payment\_updater\_ca\_itn\_01](#module\_payment\_updater\_ca\_itn\_01) | pagopa-dx/azure-container-app/azurerm | ~> 3.0 |
| <a name="module_reminder_ca_itn_01"></a> [reminder\_ca\_itn\_01](#module\_reminder\_ca\_itn\_01) | pagopa-dx/azure-container-app/azurerm | ~> 3.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_key_vault_access_policy.reminder](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_private_dns_resolver_forwarding_rule.pagopa-core-evhns](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_forwarding_rule) | resource |
| [azurerm_role_assignment.cae_admins_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.key_vault_com_cae_secrets_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_key_vault_secret.mysql_password](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.mysql_reminder_db_url](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.mysql_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.notify_endpoint_subscription_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.pagopa_ecommerce_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.pagopa_proxy_subscription_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.paymentup_endpoint_subscription_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.paymentup_messages_jaas_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.paymentup_mongo_database_uri](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.paymentup_nodo_dei_pagamenti_biz_evt_jaas_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.paymentup_payment_updates_jaas_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.reminder_messages_jaas_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.reminder_messages_send_jaas_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.reminder_messages_status_jaas_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.reminder_mongo_database_uri](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.reminder_payment_updates_jaas_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.senders_to_skip](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.senders_to_use](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_application_insights"></a> [application\_insights](#input\_application\_insights) | n/a | <pre>object({<br/>    connection_string = string<br/>  })</pre> | n/a | yes |
| <a name="input_dns_forwarding_ruleset_id"></a> [dns\_forwarding\_ruleset\_id](#input\_dns\_forwarding\_ruleset\_id) | Id of the DNS Forwarding Ruleset to use for the Container App Environment | `string` | n/a | yes |
| <a name="input_entra_id_admin_ids"></a> [entra\_id\_admin\_ids](#input\_entra\_id\_admin\_ids) | Id of Entra ID groups that should be admins of the Container App Environment | `set(string)` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix    = string<br/>    env_short = string<br/>    location  = string<br/>    domain    = string<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault_id"></a> [key\_vault\_id](#input\_key\_vault\_id) | Id of the team domain key vault | `string` | n/a | yes |
| <a name="input_log_analytics_workspace_id"></a> [log\_analytics\_workspace\_id](#input\_log\_analytics\_workspace\_id) | n/a | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | n/a | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_subnet_cidr"></a> [subnet\_cidr](#input\_subnet\_cidr) | n/a | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | n/a | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tenant_id"></a> [tenant\_id](#input\_tenant\_id) | Tenant id | `string` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | n/a | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_paymentup"></a> [paymentup](#output\_paymentup) | n/a |
| <a name="output_reminder"></a> [reminder](#output\_reminder) | n/a |
<!-- END_TF_DOCS -->

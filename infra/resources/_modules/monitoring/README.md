# monitoring

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.16.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_action_group.io_com_error](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_action_group) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_io_com_slack_email"></a> [io\_com\_slack\_email](#input\_io\_com\_slack\_email) | Uri of the slack channel where to send domain related alerts | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_action_group"></a> [action\_group](#output\_action\_group) | n/a |
<!-- END_TF_DOCS -->

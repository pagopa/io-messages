module "messages-evh" {
  source = "github.com/pagopa/dx//infra/modules/azure_event_hub?ref=3f205e62474782678a563f4cff92e479a34feecd"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = var.location
    domain          = var.domain
    app_name        = "elt"
    instance_number = var.instance_number
  }

  eventhubs = [{
    name                   = local.eventhub_name
    partitions             = local.eventhub_partition_count
    message_retention_days = local.eventhub_message_retention
    keys                   = local.eventhub_auth_messages_keys
    consumers              = []
  }]

  private_dns_zone_resource_group_name = local.private_dns_zone_resource_group_name
  resource_group_name                  = var.resource_group_name

  tags = var.tags

  subnet_pep_id = var.subnet_pep_id
}

module "etl" {
  source = "github.com/pagopa/dx//infra/modules/azure_event_hub?ref=3f205e62474782678a563f4cff92e479a34feecd"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = var.location
    domain          = var.domain
    app_name        = "etl"
    instance_number = "01"
  }

  eventhubs = [{
    name                   = "messages-evh"
    partitions             = 32
    message_retention_days = 7
    keys = [{
      name   = "io-messages"
      listen = false
      send   = true
      manage = false
      },
      {
        name   = "pdnd"
        listen = true
        send   = false
        manage = false
    }]
    consumers = []
  }]

  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  resource_group_name                  = var.resource_group_name

  allowed_sources = local.evhns.allowed_sources
  tags            = var.tags

  subnet_pep_id = var.subnet_pep_id
}

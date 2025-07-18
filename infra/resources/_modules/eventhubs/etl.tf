module "etl" {
  source  = "pagopa-dx/azure-event-hub/azurerm"
  version = "~> 0.0"

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
    },
    {
      name                   = "message-status-evh"
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
    },
    {
      name                   = "cqrs-message-evh"
      partitions             = 5
      message_retention_days = 7
      keys = [
        {
          name   = "cqrs"
          listen = false
          send   = true
          manage = false
        },
        {
          name   = "paymentup"
          listen = true
          send   = false
          manage = false
        },
        {
          name   = "reminder"
          listen = true
          send   = false
          manage = false
        }
      ],
      consumers = []
    },
    {
      name                   = "cqrs-message-status-evh"
      partitions             = 5
      message_retention_days = 7
      keys = [
        {
          name   = "cqrs"
          listen = false
          send   = true
          manage = false
        },
        {
          name   = "reminder"
          listen = true
          send   = false
          manage = false
        }
      ],
      consumers = []
    },
    {
      name                   = "payment-updates-evh"
      partitions             = 5
      message_retention_days = 7
      keys = [
        {
          name   = "payment-updater"
          listen = false
          send   = true
          manage = false
        },
        {
          name   = "reminder"
          listen = true
          send   = false
          manage = false
        },
      ],
      consumers = []
    },
    {
      name                   = "reminder-message-send-evh"
      partitions             = 5
      message_retention_days = 7
      keys = [
        {
          name   = "reminder"
          listen = true
          send   = true
          manage = false
        }
      ],
      consumers = []
    },
  ]

  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  resource_group_name                  = var.resource_group_name

  allowed_sources = local.evhns.allowed_sources
  tags            = var.tags

  subnet_pep_id = var.subnet_pep_id
}

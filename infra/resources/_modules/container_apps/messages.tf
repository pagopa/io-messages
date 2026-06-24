module "messages_ca" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 5.0"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = "messages"
    instance_number = "01"
  }

  // TODO: Check if we need a ca_env for each domain.
  container_app_environment_id = module.com_cae_env.id

  log_analytics_workspace_id = var.log_analytics_workspace_id

  containers = [
    {
      # TODO: Add:
      # - The correct image
      # - Add the correct sha
      image = "ghcr.io/pagopa/io-com-messages"
      name  = "io-messages"

      # TODO: Add app settings
      app_settings = {}

      liveness_probe = {
        path = "/api/info"
      }
    },
  ]

  # TODO: Define autoscale settings.
  autoscaler = {}

  container_port = 3000

  resource_group_name = var.resource_group_name

  tags = var.tags
}

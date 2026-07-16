module "remote_content_ca" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 5.0"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = "rc"
    instance_number = "01"
  }

  container_app_environment_id = module.com_cae_env.id

  log_analytics_workspace_id = var.log_analytics_workspace_id

  containers = [
    {
      image = "ghcr.io/pagopa/io-com-rc"
      name  = "io-rc"

      app_settings = {
        HOST                                = "0.0.0.0"
        NODE_ENV                            = "production"
        PORT                                = 3000
        REMOTE_CONTENT_COSMOS_DATABASE_NAME = "remote-content-cosmos-01"
        REMOTE_CONTENT_COSMOS_URI           = var.common_cosmos_account.endpoint
      }

      liveness_probe = {
        path = "/api/info"
      }
    },
  ]

  autoscaler = {
    replicas = {
      minimum = 0
      maximum = 8
    }
  }

  container_port = 3000

  resource_group_name = var.resource_group_name

  tags = var.tags
}

module "remote_content_ca_role_assignments" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 3.0"

  principal_id    = module.remote_content_ca.principal_id
  subscription_id = var.subscription_id

  cosmos = [
    {
      account_name        = var.common_cosmos_account.name
      resource_group_name = var.common_cosmos_account.resource_group_name
      description         = "Allow web app to read on cosmos containers"
      role                = "writer"
      database            = "remote-content-cosmos-01"
      collections         = ["message-configuration"]
    }
  ]
}

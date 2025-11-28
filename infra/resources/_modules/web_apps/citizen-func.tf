locals {
  citizen_func = {
    app_settings = {
      NODE_ENV = "production"

      // IO COSMOSDB
      COSMOSDB_NAME = "db"
      COSMOSDB_URI  = var.cosmosdb_account_api.endpoint

      // REMOTE CONTENT COSMOSDB
      REMOTE_CONTENT_COSMOSDB_NAME = "remote-content-cosmos-01"
      REMOTE_CONTENT_COSMOSDB_URI  = var.io_com_cosmos.endpoint

      // BLOB STORAGE
      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING = var.message_content_storage.connection_string
      IO_COM_STORAGE_CONNECTION_STRING          = var.com_st_connectiostring
      MESSAGE_CONTAINER_NAME                    = "message-content"

      // REDIS
      REDIS_URL      = var.redis_cache.hostname
      REDIS_PORT     = var.redis_cache.port
      REDIS_PASSWORD = var.redis_cache.access_key

      // INTERNAL USE PROPERTIES
      PN_SERVICE_ID              = "01G40DWQGKY5GRWSNM4303VNRP" # PN
      SERVICE_CACHE_TTL_DURATION = "28800"                      # 8 hours
      RC_CONFIGURATION_CACHE_TTL = "28800"
      SERVICE_TO_RC_CONFIGURATION_MAP = jsonencode({
        "01G40DWQGKY5GRWSNM4303VNRP" = "01HMVMHCZZ8D0VTFWMRHBM5D6F", # PN
        "01GQQZ9HF5GAPRVKJM1VDAVFHM" = "01HMVMDTHXCESMZ72NA701EKGQ", # IO Sign
        "01H4ZJ62C1CPGJ0PX8Q1BP7FAB" = "01HMVMCDD3JFYTPKT4ZN4WQ73B", # PagoPA Receipt (Test)
        "01HD63674XJ1R6XCNHH24PCRR2" = "01HMVM9W74RWH93NT1EYNKKNNR", # PagoPA Receipt
        "01GQQDPM127KFGG6T3660D5TXD" = "01HMVM4N4XFJ8VBR1FXYFZ9QFB", # Third Party Mock
      })

      // MESSAGE VIEW FF
      USE_FALLBACK          = false
      FF_TYPE               = "none"
      FF_BETA_TESTER_LIST   = "[]"
      FF_CANARY_USERS_REGEX = "^([(0-9)|(a-f)|(A-F)]{62}00)$" // takes 0.4% of users

      // Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"
    }
  }
}

module "citizen_func_new" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.0"

  environment = merge(var.environment, {
    app_name        = "citizen"
    instance_number = "02"
  })

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/info"
  node_version        = 20

  size = "P3mv3"

  subnet_cidr                          = var.subnet_cidrs.citizen_func_new
  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.citizen_func.app_settings
  slot_app_settings = local.citizen_func.app_settings

  tags = var.tags

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = 5

  action_group_ids = [var.action_group_id]
}

resource "azurerm_subnet_nat_gateway_association" "functions_messages_citizen_subnet_new" {
  subnet_id      = module.citizen_func_new.subnet.id
  nat_gateway_id = var.nat_gateway_id
}

resource "azurerm_role_assignment" "citizen_func_cosmosdb_account_api_new" {
  for_each = toset([
    module.citizen_func_new.function_app.function_app.principal_id,
    module.citizen_func_new.function_app.function_app.slot.principal_id
  ])
  scope                = var.cosmosdb_account_api.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}

resource "azurerm_cosmosdb_sql_role_assignment" "citizen_func_api_new" {
  for_each = toset([
    module.citizen_func_new.function_app.function_app.principal_id,
    module.citizen_func_new.function_app.function_app.slot.principal_id
  ])
  resource_group_name = var.cosmosdb_account_api.resource_group_name
  account_name        = var.cosmosdb_account_api.name
  scope               = var.cosmosdb_account_api.id
  role_definition_id  = "${var.cosmosdb_account_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = each.value
}

resource "azurerm_role_assignment" "citizen_func_io_com_cosmos_new" {
  for_each = toset([
    module.citizen_func_new.function_app.function_app.principal_id,
    module.citizen_func_new.function_app.function_app.slot.principal_id
  ])
  scope                = var.io_com_cosmos.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}

resource "azurerm_cosmosdb_sql_role_assignment" "citizen_func_com_new" {
  for_each = toset([
    module.citizen_func_new.function_app.function_app.principal_id,
    module.citizen_func_new.function_app.function_app.slot.principal_id
  ])
  resource_group_name = var.io_com_cosmos.resource_group_name
  account_name        = var.io_com_cosmos.name
  scope               = var.io_com_cosmos.id
  role_definition_id  = "${var.io_com_cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = each.value
}

module "citizen_func_autoscaler_new" {
  source  = "pagopa-dx/azure-app-service-plan-autoscaler/azurerm"
  version = "~> 1.0"

  resource_group_name = module.citizen_func_new.function_app.resource_group_name
  location            = var.environment.location

  app_service_plan_id = module.citizen_func_new.function_app.plan.id

  target_service = {
    function_app = {
      name = module.citizen_func_new.function_app.function_app.name
    }
  }

  scale_metrics = {
    cpu = {
      cooldown_decrease         = 20,
      cooldown_increase         = 3,
      decrease_by               = 3,
      increase_by               = 3,
      lower_threshold           = 20,
      statistic_decrease        = "Max",
      statistic_increase        = "Max",
      time_aggregation_decrease = "Maximum",
      time_aggregation_increase = "Maximum",
      time_window_decrease      = 5,
      time_window_increase      = 2,
      upper_threshold           = 50
    },
  }

  scheduler = {
    normal_load = {
      default = 16,
      minimum = 16
    },

    # low_load = {
    #   minimum = 2,
    #   name    = "low_load_profile",
    #   default = 10,
    #   start = {
    #     hour    = 22,
    #     minutes = 0
    #   }
    #   end = {
    #     hour    = 5,
    #     minutes = 0
    #   },
    # },

    maximum = 30,
  }

  tags = var.tags
}

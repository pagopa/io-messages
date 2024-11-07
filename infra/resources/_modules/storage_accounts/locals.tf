locals {
  nonstandard = {
    weu = {
      api         = "${var.project_legacy}stapi"
      api_replica = "${var.project_legacy}stapireplica"
      api_events  = "${var.project_legacy}stapievents"
    }
  }
}
###Italy North
locals {
  prefix          = "io"
  env_short       = "p"
  domain          = "apireplica"
  instance_number = "01"
  itn_environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = var.location
    domain          = local.domain
    instance_number = local.instance_number
  }
}

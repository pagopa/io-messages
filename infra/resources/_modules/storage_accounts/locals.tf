locals {
  nonstandard = {
    weu = {
      api         = "${var.project_legacy}stapi"
      api_replica = "${var.project_legacy}stapireplica"
      api_events  = "${var.project_legacy}stapievents"
    }
  }
}

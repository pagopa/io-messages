locals {

  nonstandard = {
    weu = {
      ntfns        = "${var.project}-ntfns-common-partition"
      ntf          = "${var.project}-ntf-common-partition"
      common_ntfns = "${var.project}-ntfns-common"
      common_ntf   = "${var.project}-ntf-common"

      sandbox_ntfns           = "${var.project}-ntfns-sandbox"
      sandbox_partition_ntfns = "${var.project}-ntfns-sandbox-partition"
      sandbox_ntf             = "${var.project}-ntf-sandbox"
      sandbox_partition_ntf   = "${var.project}-ntf-sandbox-partition"
    }
  }

  apns_credential = {
    application_mode = "Production"
    bundle_id        = "it.pagopa.app.io"
    team_id          = "M2X5YQ4BJ7"
    key_id           = "PL6AXY2HSQ"
  }
}

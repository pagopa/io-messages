locals {
  repository = {
    name                     = "io-messages"
    description              = "This is a monorepo that contains all the backend microservices and functionalities related to messaging in IO."
    topics                   = ["backend", "io", "messages", "comunicazione", "iocom"]
    reviewers_teams          = ["io-communication-backend", "engineering-team-cloud-eng"]
    default_branch_name      = "main"
    infra_cd_policy_branches = ["main"]
    opex_cd_policy_branches  = ["main"]
    app_cd_policy_branches   = ["main"]
    app_cd_policy_tags       = ["*@*"]
    jira_boards_ids          = ["CES", "IOCOM"]
  }
}

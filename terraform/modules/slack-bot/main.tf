data "aws_ssm_parameter" "signing_secret" {
  name = "/${var.env}/slack-bot/signing-secret"
}

data "aws_ssm_parameter" "bot_token" {
  name = "/${var.env}/slack-bot/bot-token"
}

locals {
  config         = jsondecode(file("${var.repo_root}/config.${var.env}.json"))
  lambdas        = local.config.lambdas
  signing_secret = data.aws_ssm_parameter.signing_secret.value
  bot_token      = data.aws_ssm_parameter.bot_token.value
}

resource "null_resource" "transpile_lambdas" {
  triggers = {
    always_run = "${timestamp()}"
  }

  provisioner "local-exec" {
    working_dir = var.repo_root
    command     = "npm run build"
  }
}

module "slack_bot_lambda" {
  source = "../slack-bot-lambda"

  env = var.env

  repo_root = var.repo_root

  signing_secret = local.signing_secret
  bot_token      = local.bot_token
  aws_endpoint   = var.aws_endpoint

  depends_on = [null_resource.transpile_lambdas]
}

module "sqs_dispatcher_lambda" {
  source = "../sqs-dispatcher-lambda"

  env = var.env

  repo_root = var.repo_root

  signing_secret = local.signing_secret
  bot_token      = local.bot_token
  aws_endpoint   = var.aws_endpoint

  depends_on = [null_resource.transpile_lambdas]
}

module "custom_lambdas" {
  for_each = { for lambda in local.lambdas : lambda.name => lambda }

  source = "../custom-lambda"

  env    = var.env
  name   = each.value.name
  path   = each.value.path
  config = each.value.config

  repo_root = var.repo_root

  slack_bot_lambda_arn = module.slack_bot_lambda.lambda_arn
  signing_secret       = local.signing_secret
  bot_token            = local.bot_token
  aws_endpoint         = var.aws_endpoint
  queue_url            = module.sqs_dispatcher_lambda.queue_url

  depends_on = [null_resource.transpile_lambdas]
}

apply-terraform: apply-main

apply-main-terraform:
	docker run -it --rm $(DEFAULT_ARGS) $(DOCKER_IMAGE):$(TF_VER) terraform apply $(tf_args)

get-terraform:
	docker run -it --rm $(DEFAULT_ARGS) $(DOCKER_IMAGE):$(TF_VER) terraform get --update $(tf_args)

init-terraform:
	docker run -it --rm $(DEFAULT_ARGS) $(DOCKER_IMAGE):$(TF_VER) terraform init $(tf_args)

plan-terraform:
	docker run -it --rm $(DEFAULT_ARGS) $(DOCKER_IMAGE):$(TF_VER) terraform plan $(tf_args)

destroy-terraform:
	docker run -it --rm $(DEFAULT_ARGS) $(DOCKER_IMAGE):$(TF_VER) terraform destroy $(tf_args)

validate-terraform:
	docker run -it --rm $(DEFAULT_ARGS) $(DOCKER_IMAGE):$(TF_VER) terraform validate $(tf_args)

lint:
	docker run -it --rm -v $(MY_PWD):/data -e TFLINT_LOG=warn --entrypoint '' -w /data/$(MY_ENV) wata727/tflint tflint --module .
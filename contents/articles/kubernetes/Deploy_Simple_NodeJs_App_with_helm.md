## Deploy NodeJs App to Kubernetes with helm

![Author Nashwan](https://img.shields.io/badge/Author-Nashwan%20Mustafa-7a2840.svg?style=flat-square)

in this Article I will explain how to build, publish nodejs app to docker registery and then deploy the built image of nodejs app to minikube with helm. 

Accordingly to the official website — Helm is a package manager for Kubernetes. It helps deploy complex application by bundling necessary resources into Charts, which contains all information to run application on a cluster.

Please make sure you have the following installed for your environment to be ready for applincation deployemnt with helm. In my demo I’m using:
- Docker
- locally installed Kubernetes cluster — minikube
- Kubernetes command line tool — kubectl
- Helm (v3).


Now lets start writing a simple nodejs api application for our tutorial test.

First, let’s create a new main folder to add our source codes. I will name this `myapp` and inside that let’s create another folder for nodejs application code name it as `src`.
```bash
mkdir -p myapp/src
cd myapp/src
```

# NodeJS app
From the terminal navigate to myapp/src folder and run:
```bash
npm init -y # Generate package.json
npm i express # Install express
touch index.js # Create a new index.js file
```

Now lets write a simple nodejs code for our application inside index.js
```js
// // Node Modules
const fs = require('fs');
const http = require('http');
const url = require('url');

const git = require("git-rev-sync");
// const git_commit_sha = (git.short());
const git_commit_sha = process.env.GIT_SHA || (git.short());
const port = 8080;
const log_level = "INFO";

// const git_commit_sha = `git rev-parse --short HEAD`

const info = {
    service_name: "myapplication",
    version: "1.0.0",
    git_commit_sha: `${git_commit_sha}`,
    environment: {
        service_port: `${port}`,
        log_level: `${log_level}`,
    }
}

const jsonString = JSON.stringify(info, null, 2);
fs.writeFileSync('./dev-data/data.json', jsonString)
console.log('Successfully wrote file');

// // it reads the file, and parse it into data
const data = fs.readFileSync(`${__dirname}/dev-data/data.json`, 'utf-8');
const dataObj = JSON.parse(data);
const server = http.createServer((req, res) => {
    const { query, pathname } = (url.parse(req.url, true));

    // info page
    if (pathname === '/info') {
        res.writeHead(200, { 'Content-type': 'application/json'});
        res.end(data);

    // Not Found

    } else {
        res.writeHead(404, {
            'Content-type': 'text/html',
            'my-own-header': 'hello-world'
        });
        res.end('<h1>Page not found!</h1>');
    }
});

server.listen(8080, () => {
    // console.log('Server listening on port 8080')
    process.stdout.write("MyApp Web API listening on port 8080\n");
})
```

In the package.json file, under the scripts object, add the following.
```json
"scripts": {
    "start": "node index.js"
 }
```

Now let’s run the server to check if our app works as intended. Type
npm start and you should get the following log.
```bash
npm start
Successfully wrote file
MyApp Web API listening on port 8080
```

Then on a separate terminal run
`curl http://localhost:8080`

# Build and Publish image
So far so good, now lets wrap this small applciation into a Dockerfile.

```Dockerfile
FROM node:14

# Create app directory
WORKDIR /usr/src/app

ARG GIT_SHA=""
LABEL git_sha=${GIT_SHA}
ENV GIT_SHA=${GIT_SHA}

RUN npm config set strict-ssl true
COPY package*.json ./

# Install app dependencies
RUN npm install
 
# Bundle app source
COPY index.js .
RUN mkdir dev-data

EXPOSE 8080
CMD [ "node", "./index.js" ]
```

Now, lets build the docker image for this nodejs app and run the image as container:
```bash
cd src/
docker build --build-arg=GIT_SHA=$(git rev-parse --short HEAD) -t nbmustafa/myanzapp .

docker images
REPOSITORY                    TAG       IMAGE ID       CREATED          SIZE
nbmustafa/myapp                 latest    de4c6d54f34c   33 minutes ago   980MB

docker run -i -p 5000:8080 de4c6d54f34c

# tag image and publish it to dockerhub repo
docker tag nbmustafa/myapp:latest nbmustafa/myapp:1.0.0
docker push nbmustafa/myapp:1.0.0
```
Exellent, so now we have the image build and pushed to dockerhub. 



# Deploy nodejs Application to minikube with helm
There are couple approaches how to work with Helm. One of them is to download publicly available charts from the Helm Hub. They are prepared by community and are free to use.

For instance, if we would like to run Nginx-ingress on a cluster, it’s described on this page — https://artifacthub.io/packages/helm/nginx/nginx-ingress — with the following commands:

```bash
helm repo add nginx-stable https://helm.nginx.com/stable

helm repo update

helm install my-release nginx-stable/nginx-ingress

# For NGINX Plus: (assuming you have pushed the Ingress controller image nginx-plus-ingress to your private registry myregistry.example.com)
helm install my-release nginx-stable/nginx-ingress --set controller.image.repository=myregistry.example.com/nginx-plus-ingress --set controller.nginxplus=true

```


It contains some default configuration, but can be easily overridden with YAML file and passed during installation. The detailed example I’ll show in a minute.
But Helm is not only providing some predefined blueprints, you can create your own charts!
It’s very easy and can be done by a single command helm create <chart-name> , which creates a folder with a basic structure:

```bash
helm create myapp
Creating myapp
```

In the templates/ folder there are Helm templates that with combination of values.yaml will result in set of Kubernetes objects.

```bash
ls -l myapp/
total 16
-rw-r--r--  1 nashwan  staff   903B  4 Nov 17:22 Chart.yaml
drwxr-xr-x  2 nashwan  staff    64B  4 Nov 17:22 charts/
drwxr-xr-x  9 nashwan  staff   288B  4 Nov 17:22 templates/
-rw-r--r--  1 nashwan  staff   1.5K  4 Nov 17:22 values.yaml


s -l myapp/templates/
total 48
-rw-r--r--  1 nashwan  staff   1.5K  4 Nov 17:22 NOTES.txt
-rw-r--r--  1 nashwan  staff   1.8K  4 Nov 17:22 _helpers.tpl
-rw-r--r--  1 nashwan  staff   1.6K  4 Nov 17:22 deployment.yaml
-rw-r--r--  1 nashwan  staff   1.0K  4 Nov 17:22 ingress.yaml
-rw-r--r--  1 nashwan  staff   355B  4 Nov 17:22 service.yaml
-rw-r--r--  1 nashwan  staff   203B  4 Nov 17:22 serviceaccount.yaml
drwxr-xr-x  3 nashwan  staff    96B  4 Nov 17:22 tests/

```

When everything is installed you can start up the minikube cluster and enable ingress addon:
Check your minikube status, 
```bash
minikube status
❗  Executing "docker container inspect minikube --format={{.State.Status}}" took an unusually long time: 2.292283407s
💡  Restarting the docker service may improve performance.
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

if not running started
```bash
minikube start
😄  minikube v1.8.1 on Mac
✨  Automatically selected the docker driver
🔥  Creating Kubernetes in docker container with (CPUs=2) (8 available), Memory=2200MB (7826MB available) ...
🐳  Preparing Kubernetes v1.17.3 on Docker 19.03.2 ...
▪ kubeadm.pod-network-cidr=192.168.49.0/24
❌  Unable to load cached images: loading cached images: stat /home/nashwan/.minikube/cache/images/k8s.gcr.io/kube-proxy_v1.17.3: no such file or directory
🚀  Launching Kubernetes ...
🌟  Enabling addons: default-storageclass, storage-provisioner
⌛  Waiting for cluster to come online ...
🏄  Done! kubectl is now configured to use "minikube"
$ minikube addons enable ingress
🌟  The 'ingress' addon is enabled
```

To check the IP of your minikube:
```bash
minikube ip
192.168.49.2
```

Now we can create first Helm chart:
```bash
helm create myapp
Creating myapp
```

In helm chart template folder we need the following templates:
- config.yaml
- deployment.yaml
- service.yaml

Lets now check the deployment template:
```go
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
    {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
    {{- end }}
      serviceAccountName: {{ include "myapp.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
              protocol: {{ .Values.service.protocol }}
          livenessProbe:
            httpGet:
              path: /info
              port: http
          readinessProbe:
            httpGet:
              path: /info
              port: http
          resources:
            {{- toYaml .Values.resources | nindent 12 }}

          envFrom:
            - configMapRef:
                name: {{ include "myapp.fullname" . }}

      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
    {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
    {{- end }}
    {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
    {{- end }}
```

At first glance you might see these strange parts between two pairs of curly brackets, like `image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"` . They are written in Go template language and are referring to a value located in a `values.yaml` which is located inside the root folder of a chart. For mentioned example Helm will try to match it with a value from `values.yaml`:

```bash
image:
  repository: nbmustafa/myapp
  tag: 1.0.0
  pullPolicy: IfNotPresent
```

Another example of that is   `containerPort: {{ .Values.service.port }}` which referes to a value located in `values.yaml`:
```bash
service:
  port: 8080
```

And so on. We can define the structure inside this file whatever we like.


Next thing we do service.yaml template
```bash
apiVersion: v1
kind: Service
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.targetPort }}
      protocol: {{ .Values.service.protocol }}
      name: {{ .Values.service.name }}
  selector:
    {{- include "myapp.selectorLabels" . | nindent 4 }}

```

 Finally, we configure ConfigMap template in config.yaml
```bash
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
data: 
  {{- range $key, $val := .Values.env.config }}
    {{ $key }}: {{ $val | quote}}
  {{- end}}
```

Here you might see a strange {{ -range ... }} clause, which can be translated as a for each loop known in any programming language. In above example, Helm template will try to inject values from an array defined in values.yaml:
```bash
env:
  config:
    version: 1.0.0
    GIT_SHA: abc858a
    log_level: INFO
    service_port: 8080
  secret:
    variable4: value4
    variable5: value5
    variable6: value6
```

The entire `value.yaml` will look like below:
```bash
replicaCount: 1
env:
  config:
    version: 1.0.0
    GIT_SHA: abc858a
    log_level: INFO
    service_port: 8080
  secret:
    variable4: value4
    variable5: value5
    variable6: value6
image:
  repository: nbmustafa/myapp
  tag: 1.0.0
  pullPolicy: IfNotPresent
imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""
serviceAccount:
  create: true
  name:
podSecurityContext: {}
securityContext: {}
service:
  type: NodePort
  protocol: TCP
  port: 8080
  targetPort: 8080
ingress:
  enabled: false
  annotations: {}
  hosts:
    - host: nashwan-mustafa.local
      paths: []
  tls: []
resources: {}
nodeSelector: {}
tolerations: []
affinity: {}

```

Now, in order to create | upadte | delete release for our application, create the following make file, then we use Make to :
```bash
GIT_SHA=$(shell git rev-parse --short HEAD)
USER=nbmustafa
RELEASE_TAG=1.0.0
HELM_REPO=https://nbmustafa.github.io/myapp-helm-chart/
RELEASE_NAME=dev

build:
	@echo Building container
	docker build --build-arg=GIT_SHA=$(git rev-parse --short HEAD) -t myapp .

push:
	docker tag $(USER)/myapp:latest $(CI_USER)/myapp:$(RELEASE_TAG) 
	docker push $(USER)/myapp:$(RELEASE_TAG)

plan:
	@echo plan Helm chart 
	helm install --dry-run $(RELEASE_NAME) helm/myapp --set env.config.GIT_SHA=$(GIT_SHA)

deploy:
	@echo Installing Helm chart 
	helm install $(RELEASE_NAME) helm/myapp --set env.config.GIT_SHA=$(GIT_SHA)

replan:
	@echo plan Helm chart 
	helm upgrade --dry-run dev helm/myapp --set env.config.GIT_SHA=$(GIT_SHA)

update:
	@echo Installing Helm chart 
	helm upgrade $(RELEASE_NAME) helm/myapp --set env.config.GIT_SHA=$(GIT_SHA)

list:
	@echo list deployed Helm charts
	helm list

delete:
	@echo Uninstalling Helm chart 
	helm uninstall $(RELEASE_NAME)

kg:
	@echo display kubernetes resources deployed with Helm chart 
	kubectl get svc,deploy,configmap

kd:
	@echo describe pod details 
	kubectl describe po

run:
	@echo get minikube service url
	minikube service dev-myapp --url
```

Now we run the following Make command to deploy, delete or update our releases.
```bash
# Show the plan what would be deployed
make plan

# Deploy your application
make deploy

# Update the release or deployment of your application
make update

# Delete the release
make delete

# Show the URL of your Service
make run
```


# Conclusions
In this article I’ve tried to present how, with Helm, you can deploy an application to kubernetes and reducing maintenance overhead and minimise a big amount of copy-pasting tasks and can bring a one single template for deploying multiple applications on a Kubernetes cluster, which might be very handy in a microservice world. I hope you’ve learnt something new and enjoyed it.

In order to deploy each application we still need to run imperative commands, like helm install.
But there is still one thing left, which holds us from establishing a fully declarative approach for an infrastructure. and that can be done with Helmfile approach which we havent covered that in this article. 




For more articles see [My Github Page](https://nbmustafa.github.io).

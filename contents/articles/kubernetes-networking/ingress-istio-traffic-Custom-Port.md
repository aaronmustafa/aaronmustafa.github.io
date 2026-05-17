# How to Allow Traffic on Custom Port 8443 to EKS via NLB and Istio Ingress Gateway

![Author Nashwan](https://img.shields.io/badge/Author-Nashwan%20Mustafa-7a2840.svg?style=flat-square)

To allow traffic on custom port **8443** to an EKS cluster via an **NLB** to the **Istio Ingress Gateway** and all the way to the pods—while considering that the **Gatekeeper policy** only allows Istio Gateway configuration on port **443**—follow these steps:

---

## 1. Modify the Istio Ingress Gateway Configuration

Update the Istio Ingress Gateway to expose port **8443** by modifying the **IstioOperator** resource to include the new port.

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-with-extra-ports
spec:
  profile: default
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            ports:
              - port: 80
                targetPort: 8080
                name: http2
              - port: 443
                targetPort: 8443
                name: https
              - port: 8443
                targetPort: 8443
                name: custom-https
````

---

## 2. Update the Gateway Resource

Configure the **Gateway** resource to listen on port **8443**.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: my-credential
      hosts:
        - "*"
    - port:
        number: 8443
        name: custom-https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: my-credential
      hosts:
        - "*"
```

---

## 3. Create or Update the VirtualService

Define a **VirtualService** to route traffic from port **8443** to the appropriate service.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: my-virtualservice
  namespace: istio-system
spec:
  hosts:
    - "*"
  gateways:
    - my-gateway
  http:
    - match:
        - port: 8443
      route:
        - destination:
            host: my-service
            port:
              number: 8443
```

---

## 4. Adjust Gatekeeper Policies

Ensure that **Gatekeeper** policies allow the Istio Ingress Gateway to use port **8443**. Update the `ConstraintTemplate` and `Constraint` accordingly.

```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8sallowedports
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedPorts
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedports
        violation[{"msg": msg}] {
          input.review.object.spec.ports[_].port != 443
          input.review.object.spec.ports[_].port != 8443
          msg := sprintf("Port %v is not allowed", [input.review.object.spec.ports[_].port])
        }
```

---

## 5. Deploy and Verify

Apply the updated configurations and verify that traffic on **port 8443** is correctly routed to your pods.

---

## References

1. [Istio / Ingress Sidecar TLS Termination](https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sidecar-tls-termination/)
2. [How to expose custom ports on Istio ingress gateway - Learn Cloud Native](https://learncloudnative.com/blog/2022-08-01-istio-gateway)
3. [Istio / Ingress Gateway without TLS Termination](https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/)
4. [Ingress Gateways - Istio](https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/)


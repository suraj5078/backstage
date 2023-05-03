---
'@backstage/plugin-kubernetes': minor
---

Added Pod logs components for Kubernetes plugin

**BREAKING**: `kubernetesProxyApi` for custom plugins built with components from the Kubernetes plugin apis, `kubernetesProxyApi` should be added to the plugin's API list.

```
...
export const kubernetesPlugin = createPlugin({
  id: 'kubernetes',
  apis: [
...
    createApiFactory({
        api: kubernetesProxyApiRef,
        deps: {
        kubernetesApi: kubernetesApiRef,
        },
        factory: ({ kubernetesApi }) =>
        new KubernetesProxyClient({
            kubernetesApi,
        }),
    }),
```

**BREAKING**: `KubernetesDrawer` is now called `KubernetesStructuredMetadataTableDrawer` so that we can do more than just show `StructuredMetadataTable`

`import { KubernetesDrawer } from "@backstage/plugin-kubernetes"`

should now be:

`import { KubernetesStructuredMetadataTableDrawer } from "@backstage/plugin-kubernetes"`

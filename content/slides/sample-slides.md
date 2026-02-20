---
title: "Starlit repo usage"
authors: ["A Q R", "20 Feb 2026", " Dummy "]
date: "20 Feb 2026"
description: "Starlit repo usage - used for testing starlit repo"
publishedAt: "20 Feb 2026"
---

<section>

### The following slides are from jax-autodiff-usescases.md

### Used for testing starlit repo

</section>

<section>

### First slide title

$$ f(w) = \sin(3w^2 + 2w + 5 + g(x)) $$
    * x: params, type: jax.tensor (with require_grad set to true)
    * 3, 2, 5, g(x): data, hard coded, type: convertible to jax tensors
    * f(w): function value or its grad, both jax.tensor 

```python
def polynomial_fn(w):
    return jax.lax.sin(3w^2 + 2w + 5) * g(x)

grad_fn = jax.grad(polynomial_fn)

print("Value:", polynomial_fn(w=2) ) 
print("Grad:" , grad_fn(w=2) ) 
```
 

</section>


<section>
<section>

### Use Case 1: Generic Neural Networks

In JAX: models are stateless: the parameters (params, tuneable) and data (x, constants) are passed explicitly to a pure function.

* Training Step: Gradient-Based Parameter Update
* Uses jax.grad to handle backpropagation and derive the gradients with respect to the parameters.

Assume `predict()` function is defined and initializes parameters (params)

```python
def predict_linear(params, x_batch)
    params.weights * x_batch + params.bias

def mse_loss(params, x_batch, y_target):
    preds = predict(params, x_batch)
    return jnp.mean((preds - y_target) ** 2)
```

</section>
<section>

### Training stage


```python
grad_of_loss_fn = jax.grad(mse_loss)

grads = grad_of_loss_fn(params, x, y)

# gradient decent
params = params - 0.1 * grads
```

</section>
</section>

<section>

### Conclusion

This is just added to test the starlit repo

</section>
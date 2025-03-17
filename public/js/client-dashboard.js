// Client Dashboard JavaScript

// Global variables
let currentUser = null;
let cartItems = [];
let products = [];
let csrfToken = '';

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartBadge = document.getElementById('cartBadge');
const cartTotal = document.getElementById('cartTotal');
const userFullname = document.getElementById('userFullname');
const logoutBtn = document.getElementById('logoutBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const orderHistoryContainer = document.getElementById('orderHistoryContainer');

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
logoutBtn.addEventListener('click', logout);
checkoutBtn.addEventListener('click', checkout);

// Initialize the dashboard
async function initialize() {
  try {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    // Get CSRF token
    await getCsrfToken();
    
    // Get current user info
    await getCurrentUser();
    
    // Load products
    await loadProducts();
    
    // Load cart
    await loadCart();
  } catch (error) {
    console.error('Initialization error:', error);
    showAlert('Error initializing dashboard', 'danger');
  }
}

// Get CSRF token
async function getCsrfToken() {
  try {
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get CSRF token');
    }
    
    const data = await response.json();
    csrfToken = data.csrfToken;
  } catch (error) {
    console.error('CSRF token error:', error);
    throw error;
  }
}

// Get current user info
async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
      }
      throw new Error('Failed to get user info');
    }
    
    const data = await response.json();
    currentUser = data.user;
    
    // Update UI with user info
    userFullname.textContent = currentUser.fullname;
    
    // Redirect if not a client
    if (currentUser.role !== 'client') {
      window.location.href = 'dashboard.html';
    }
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

// Load all products
async function loadProducts() {
  try {
    const response = await fetch('/api/products', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load products');
    }
    
    const data = await response.json();
    products = data.data;
    
    // Render products
    renderProducts();
  } catch (error) {
    console.error('Load products error:', error);
    showAlert('Error loading products', 'danger');
  }
}

// Render products in the UI
function renderProducts() {
  productsContainer.innerHTML = '';
  
  products.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'col-md-4 mb-4';
    productCard.innerHTML = `
      <div class="card product-card">
        <div class="card-body">
          <h5 class="card-title">${product.name}</h5>
          <p class="card-text">${product.description || 'No description available'}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="text-primary fw-bold">$${product.price.toFixed(2)}</span>
            <span class="badge bg-${product.stock > 0 ? 'success' : 'danger'}">
              ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </span>
          </div>
        </div>
        <div class="card-footer">
          <div class="d-flex">
            <input type="number" class="form-control me-2" min="1" max="${product.stock}" value="1" id="qty-${product.id}">
            <button class="btn btn-primary" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
              <i class="bi bi-cart-plus"></i> Add
            </button>
          </div>
        </div>
      </div>
    `;
    
    productsContainer.appendChild(productCard);
  });
}

// Load user's cart
async function loadCart() {
  try {
    const response = await fetch('/api/carts/my-cart', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load cart');
    }
    
    const data = await response.json();
    const cart = data.data;
    
    // Update cart items
    cartItems = cart.items || [];
    
    // Update UI
    updateCartUI();
  } catch (error) {
    console.error('Load cart error:', error);
    showAlert('Error loading cart', 'danger');
  }
}

// Add product to cart
async function addToCart(productId) {
  try {
    const quantityInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(quantityInput.value);
    
    if (isNaN(quantity) || quantity <= 0) {
      showAlert('Please enter a valid quantity', 'warning');
      return;
    }
    
    const response = await fetch('/api/carts/add-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        productId,
        quantity
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add item to cart');
    }
    
    // Reset quantity input
    quantityInput.value = 1;
    
    // Reload cart
    await loadCart();
    
    showAlert('Item added to cart', 'success');
  } catch (error) {
    console.error('Add to cart error:', error);
    showAlert(error.message, 'danger');
  }
}

// Update cart item quantity
async function updateCartItem(itemId, quantity) {
  try {
    const response = await fetch(`/api/carts/update-item/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'CSRF-Token': csrfToken
      },
      body: JSON.stringify({ quantity })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update cart item');
    }
    
    // Reload cart
    await loadCart();
  } catch (error) {
    console.error('Update cart item error:', error);
    showAlert('Error updating cart item', 'danger');
  }
}

// Remove item from cart
async function removeCartItem(itemId) {
  try {
    const response = await fetch(`/api/carts/remove-item/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'CSRF-Token': csrfToken
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove cart item');
    }
    
    // Reload cart
    await loadCart();
    
    showAlert('Item removed from cart', 'success');
  } catch (error) {
    console.error('Remove cart item error:', error);
    showAlert('Error removing cart item', 'danger');
  }
}

// Update cart UI
function updateCartUI() {
  // Update cart badge
  cartBadge.textContent = cartItems.length;
  
  // Update cart items container
  if (cartItems.length === 0) {
    cartItemsContainer.innerHTML = '<p class="text-center">Your cart is empty</p>';
    cartTotal.textContent = '0.00';
    return;
  }
  
  let total = 0;
  cartItemsContainer.innerHTML = '';
  
  cartItems.forEach(item => {
    const itemTotal = item.price_at_add * item.quantity;
    total += itemTotal;
    
    const cartItemElement = document.createElement('div');
    cartItemElement.className = 'cart-item';
    cartItemElement.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="mb-0">${item.name}</h6>
        <div>
          <span class="badge bg-primary me-2">$${item.price_at_add.toFixed(2)}</span>
          <button class="btn btn-sm btn-danger" onclick="removeCartItem(${item.id})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <div class="d-flex justify-content-between align-items-center">
        <div class="input-group input-group-sm" style="max-width: 150px;">
          <button class="btn btn-outline-secondary" type="button" 
            onclick="updateCartItem(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>
            <i class="bi bi-dash"></i>
          </button>
          <input type="text" class="form-control text-center" value="${item.quantity}" readonly>
          <button class="btn btn-outline-secondary" type="button" 
            onclick="updateCartItem(${item.id}, ${item.quantity + 1})">
            <i class="bi bi-plus"></i>
          </button>
        </div>
        <span>$${itemTotal.toFixed(2)}</span>
      </div>
    `;
    
    cartItemsContainer.appendChild(cartItemElement);
  });
  
  // Update total
  cartTotal.textContent = total.toFixed(2);
}

// Checkout (complete purchase)
async function checkout() {
  try {
    if (cartItems.length === 0) {
      showAlert('Your cart is empty', 'warning');
      return;
    }
    
    const response = await fetch('/api/carts/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'CSRF-Token': csrfToken
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Checkout failed');
    }
    
    // Reload cart
    await loadCart();
    
    // Close modal
    const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
    cartModal.hide();
    
    showAlert('Checkout completed successfully!', 'success');
  } catch (error) {
    console.error('Checkout error:', error);
    showAlert(error.message, 'danger');
  }
}

// Load order history
async function loadOrderHistory() {
  try {
    const response = await fetch('/api/carts/order-history', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load order history');
    }
    
    const data = await response.json();
    const orders = data.data;
    
    // Render order history
    renderOrderHistory(orders);
  } catch (error) {
    console.error('Load order history error:', error);
    showAlert('Error loading order history', 'danger');
  }
}

// Render order history
function renderOrderHistory(orders) {
  if (orders.length === 0) {
    orderHistoryContainer.innerHTML = '<p class="text-center">You have no previous orders</p>';
    return;
  }
  
  orderHistoryContainer.innerHTML = '';
  
  orders.forEach(order => {
    const orderDate = new Date(order.created_at).toLocaleString();
    
    const orderElement = document.createElement('div');
    orderElement.className = 'card mb-3';
    orderElement.innerHTML = `
      <div class="card-header d-flex justify-content-between">
        <span>Order #${order.id}</span>
        <span>${orderDate}</span>
      </div>
      <div class="card-body">
        <p class="card-text">Status: <span class="badge bg-success">Completed</span></p>
      </div>
    `;
    
    orderHistoryContainer.appendChild(orderElement);
  });
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

// Show alert message
function showAlert(message, type) {
  // Create alert element
  const alertElement = document.createElement('div');
  alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
  alertElement.style.zIndex = '9999';
  alertElement.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Add to document
  document.body.appendChild(alertElement);
  
  // Auto dismiss after 3 seconds
  setTimeout(() => {
    const bsAlert = new bootstrap.Alert(alertElement);
    bsAlert.close();
  }, 3000);
}

// Add event listener for order history modal
document.getElementById('orderHistoryModal').addEventListener('show.bs.modal', loadOrderHistory);
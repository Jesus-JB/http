// DOM Elements
const productForm = document.getElementById('productForm');
const productsList = document.getElementById('productsList');
const productTemplate = document.getElementById('productTemplate');
const formTitle = document.getElementById('formTitle');
const productIdInput = document.getElementById('productId');
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const stockInput = document.getElementById('stock');
const cancelEditBtn = document.getElementById('cancelEdit');
const refreshProductsBtn = document.getElementById('refreshProducts');
const alertElement = document.getElementById('alert');

// API URL
const API_URL = '/api/products';

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login page if no token
        window.location.href = 'login.html';
        return;
    }
    
    // Display user info
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // Add user info to the page
        const userInfoElement = document.createElement('div');
        userInfoElement.className = 'mb-4 d-flex justify-content-between align-items-center';
        userInfoElement.innerHTML = `
            <div>
                <h5 class="mb-0">Welcome, ${user.fullname}</h5>
                <small class="text-muted">${user.role}</small>
            </div>
            <button id="logoutBtn" class="btn btn-outline-danger">Logout</button>
        `;
        
        // Insert before the form section
        document.querySelector('.container').insertBefore(userInfoElement, document.querySelector('.form-section'));
        
        // Add logout functionality
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
    
    // Load products
    fetchProducts();
});

// Event Listeners
productForm.addEventListener('submit', handleFormSubmit);
cancelEditBtn.addEventListener('click', resetForm);
refreshProductsBtn.addEventListener('click', fetchProducts);

// Functions

// Fetch all products from API
async function fetchProducts() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            displayProducts(result.data);
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to fetch products: ' + error.message, 'danger');
    }
}

// Display products in the UI
function displayProducts(products) {
    productsList.innerHTML = '';
    
    if (products.length === 0) {
        productsList.innerHTML = '<div class="col-12"><p class="text-center">No products found. Add a new product!</p></div>';
        return;
    }
    
    products.forEach(product => {
        const productCard = productTemplate.content.cloneNode(true);
        
        // Set product data
        productCard.querySelector('.product-name').textContent = product.name;
        productCard.querySelector('.product-price').textContent = product.price.toFixed(2);
        productCard.querySelector('.product-description').textContent = product.description || 'No description';
        productCard.querySelector('.product-stock').textContent = product.stock || 0;
        
        // Set data attributes for edit and delete
        const editBtn = productCard.querySelector('.edit-product');
        const deleteBtn = productCard.querySelector('.delete-product');
        
        editBtn.dataset.id = product.id;
        deleteBtn.dataset.id = product.id;
        
        // Add event listeners
        editBtn.addEventListener('click', () => loadProductForEdit(product));
        deleteBtn.addEventListener('click', () => deleteProduct(product.id));
        
        productsList.appendChild(productCard);
    });
}

// Handle form submission (create or update)
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    const productData = {
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim(),
        price: parseFloat(priceInput.value),
        stock: parseInt(stockInput.value)
    };
    
    const productId = productIdInput.value;
    let url = API_URL;
    let method = 'POST';
    
    // If we have a product ID, we're updating
    if (productId) {
        url = `${API_URL}/${productId}`;
        method = 'PUT';
    }
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(
                `Product ${productId ? 'updated' : 'created'} successfully!`, 
                'success'
            );
            resetForm();
            fetchProducts();
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert(`Failed to ${productId ? 'update' : 'create'} product: ${error.message}`, 'danger');
    }
}

// Load product data into form for editing
function loadProductForEdit(product) {
    formTitle.textContent = 'Edit Product';
    productIdInput.value = product.id;
    nameInput.value = product.name;
    descriptionInput.value = product.description || '';
    priceInput.value = product.price;
    stockInput.value = product.stock || 0;
    
    // Show cancel button
    cancelEditBtn.classList.remove('d-none');
    
    // Scroll to form
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Delete a product
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Product deleted successfully!', 'success');
            fetchProducts();
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to delete product: ' + error.message, 'danger');
    }
}

// Reset form to initial state
function resetForm() {
    formTitle.textContent = 'Add New Product';
    productForm.reset();
    productIdInput.value = '';
    cancelEditBtn.classList.add('d-none');
}

// Show alert message
function showAlert(message, type) {
    alertElement.textContent = message;
    alertElement.className = `alert alert-${type}`;
    alertElement.style.display = 'block';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 3000);
}
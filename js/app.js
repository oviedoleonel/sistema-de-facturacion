// Funciones de utilidad
function $(id) {
    return document.getElementById(id);
}

function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
}

function showToast(message, type = 'success') {
    const toast = $('toast');
    const toastMessage = $('toastMessage');
    toastMessage.textContent = message;
    toast.className = `fixed top-5 right-5 py-2 px-4 rounded-lg shadow-lg transform transition-transform duration-500 ease-in-out ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} translate-x-0`;
    setTimeout(() => {
        toast.classList.add('translate-x-[120%]');
    }, 3000);
}

// Variable para almacenar el callback de la acción administrativa
let adminActionCallback = null;

// Modal de administrador
const adminModal = $('adminModal');
const adminPasswordInput = $('adminPasswordInput');
const adminForm = $('adminForm');
const adminPassword = 'losmarmotas123'; // La contraseña por defecto

// Función para mostrar el modal de contraseña y ejecutar una acción si es correcta
function promptForPassword(callback) {
    adminActionCallback = callback;
    adminPasswordInput.value = '';
    adminModal.classList.remove('hidden');
    adminModal.classList.add('flex');
}

// Evento de confirmación en el modal de admin
adminForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (adminPasswordInput.value === adminPassword) {
        adminModal.classList.remove('flex');
        adminModal.classList.add('hidden');
        if (adminActionCallback) {
            adminActionCallback();
            adminActionCallback = null;
        }
    } else {
        showToast('Contraseña incorrecta.', 'error');
    }
});

$('cancelAdminBtn').addEventListener('click', () => {
    adminModal.classList.remove('flex');
    adminModal.classList.add('hidden');
    adminActionCallback = null;
});

// Almacenamiento y gestión de datos en localStorage
let products = JSON.parse(localStorage.getItem('products')) || [];
let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
let currentSale = JSON.parse(localStorage.getItem('currentSale')) || [];

function saveData() {
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    localStorage.setItem('currentSale', JSON.stringify(currentSale));
}

// Lógica de navegación
const navLinks = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');

function switchSection(sectionId) {
    contentSections.forEach(section => {
        section.classList.add('hidden');
    });
    navLinks.forEach(link => {
        link.classList.remove('nav-item-active');
    });

    const activeSection = document.querySelector(sectionId);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    }
    const activeLink = document.querySelector(`a[href="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('nav-item-active');
    }
}

// Navegación con hash
window.addEventListener('hashchange', () => {
    const hash = window.location.hash || '#dashboard';
    switchSection(hash);
    renderAll();
});

// Inicializar al cargar la página
window.onload = () => {
    const hash = window.location.hash || '#dashboard';
    switchSection(hash);
    renderAll();
};

// Renderizado de las secciones
function renderAll() {
    renderDashboard();
    renderProductsTable();
    renderAvailableProductsTable();
    renderCurrentSale();
    renderReportsTable();
    renderBalanceCharts();
    renderHistoryTable();
    populateCategoryFilter();
}

// Dashboard
let weeklyProfitChart = null;
let categoryStockChart = null;

function renderDashboard() {
    // Cálculos de KPIs
    const today = new Date().toDateString();
    const salesToday = salesHistory.filter(sale => new Date(sale.date).toDateString() === today);
    const totalSalesToday = salesToday.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfitToday = salesToday.reduce((sum, sale) => sum + sale.profit, 0);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toDateString();
    }).reverse();

    const weeklyProfits = last7Days.map(day => {
        const dailySales = salesHistory.filter(sale => new Date(sale.date).toDateString() === day);
        return dailySales.reduce((sum, sale) => sum + sale.profit, 0);
    });

    const totalProfitWeek = weeklyProfits.reduce((sum, profit) => sum + profit, 0);
    const totalProfitMonth = salesHistory.filter(sale => {
        const saleDate = new Date(sale.date);
        const now = new Date();
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    }).reduce((sum, sale) => sum + sale.profit, 0);

    // Actualizar el DOM
    $('salesToday').textContent = formatCurrency(totalSalesToday);
    $('profitToday').textContent = formatCurrency(totalProfitToday);
    $('profitWeek').textContent = formatCurrency(totalProfitWeek);
    $('profitMonth').textContent = formatCurrency(totalProfitMonth);

    // Gráfico de ganancias semanales
    if (weeklyProfitChart) {
        weeklyProfitChart.destroy();
    }
    const ctx = $('weeklyProfitChart').getContext('2d');
    weeklyProfitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days.map(day => day.split(' ')[0]),
            datasets: [{
                label: 'Ganancia Semanal',
                data: weeklyProfits,
                backgroundColor: '#9333ea',
                borderColor: '#c084fc',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                    },
                    ticks: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: '#e2e8f0'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e2e8f0'
                    }
                }
            }
        }
    });

    // Stock crítico
    const criticalStockList = $('criticalStock');
    criticalStockList.innerHTML = '';
    const criticalProducts = products.filter(p => p.stock < 5);
    if (criticalProducts.length === 0) {
        criticalStockList.innerHTML = '<p class="text-gray-400">No hay productos con stock crítico.</p>';
    } else {
        criticalProducts.forEach(product => {
            const div = document.createElement('div');
            div.className = 'glass-card p-4 flex justify-between items-center';
            div.innerHTML = `
                <span>${product.name}</span>
                <span class="text-red-400 font-bold">${product.stock} unidades</span>
            `;
            criticalStockList.appendChild(div);
        });
    }
}

// Productos
const productModal = $('productModal');
const productForm = $('productForm');
const productIdInput = $('productId');
const productNameInput = $('productName');
const productCategoryInput = $('productCategory');
const productStockInput = $('productStock');
const productCostInput = $('productCost');
const productPriceInput = $('productPrice');
const productImageInput = $('productImage');
const productSearchInput = $('productSearch');
const categoryFilterSelect = $('categoryFilter');

function renderProductsTable() {
    const tableBody = $('productsTableBody');
    tableBody.innerHTML = '';

    const searchTerm = productSearchInput.value.toLowerCase();
    const categoryTerm = categoryFilterSelect.value;

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryTerm === '' || p.category.toLowerCase() === categoryTerm.toLowerCase();
        return matchesSearch && matchesCategory;
    });

    filteredProducts.forEach(product => {
        const row = tableBody.insertRow();
        row.className = 'border-t border-purple-500/30 hover:bg-purple-700/20';
        row.innerHTML = `
            <td class="p-4">${product.name}</td>
            <td class="p-4">${product.category}</td>
            <td class="p-4">${product.stock}</td>
            <td class="p-4">${formatCurrency(product.cost)}</td>
            <td class="p-4">${formatCurrency(product.price)}</td>
            <td class="p-4 space-x-2">
                <button data-id="${product.id}" class="edit-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg">Editar</button>
                <button data-id="${product.id}" class="delete-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg">Eliminar</button>
            </td>
        `;
    });

    // Manejador de eventos para botones de editar y eliminar
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            promptForPassword(() => {
                editProduct(id);
            });
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            promptForPassword(() => {
                deleteProduct(id);
            });
        });
    });
}

function populateCategoryFilter() {
    const categories = [...new Set(products.map(p => p.category))];
    categoryFilterSelect.innerHTML = '<option value="">Todas las categorías</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilterSelect.appendChild(option);
    });
}

$('addProductBtn').addEventListener('click', () => {
    promptForPassword(() => {
        $('modalTitle').textContent = 'Agregar Producto';
        productForm.reset();
        productIdInput.value = '';
        productModal.classList.remove('hidden');
        productModal.classList.add('flex');
    });
});

$('cancelProductBtn').addEventListener('click', () => {
    productModal.classList.remove('flex');
    productModal.classList.add('hidden');
});

productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const product = {
        id: productIdInput.value || Date.now().toString(),
        name: productNameInput.value,
        category: productCategoryInput.value,
        stock: parseInt(productStockInput.value),
        cost: parseFloat(productCostInput.value),
        price: parseFloat(productPriceInput.value),
        image: productImageInput.value || ''
    };

    if (productIdInput.value) {
        // Editar producto
        const index = products.findIndex(p => p.id === productIdInput.value);
        if (index !== -1) {
            products[index] = product;
            showToast('Producto actualizado correctamente.');
        }
    } else {
        // Agregar producto
        products.push(product);
        showToast('Producto agregado correctamente.');
    }
    saveData();
    productModal.classList.remove('flex');
    productModal.classList.add('hidden');
    renderAll();
});

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        $('modalTitle').textContent = 'Editar Producto';
        productIdInput.value = product.id;
        productNameInput.value = product.name;
        productCategoryInput.value = product.category;
        productStockInput.value = product.stock;
        productCostInput.value = product.cost;
        productPriceInput.value = product.price;
        productImageInput.value = product.image;
        productModal.classList.remove('hidden');
        productModal.classList.add('flex');
    }
}

function deleteProduct(id) {
    products = products.filter(p => p.id !== id);
    showToast('Producto eliminado correctamente.');
    saveData();
    renderAll();
}

productSearchInput.addEventListener('input', renderProductsTable);
categoryFilterSelect.addEventListener('change', renderProductsTable);

// Ventas
const currentSaleTableBody = $('currentSaleTableBody');
const saleTotalElement = $('saleTotal');

function renderAvailableProductsTable() {
    const tableBody = $('availableProductsTableBody');
    tableBody.innerHTML = '';
    const searchTerm = $('saleProductSearch').value.toLowerCase();
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm) && p.stock > 0);
    filteredProducts.forEach(product => {
        const row = tableBody.insertRow();
        row.className = 'border-t border-purple-500/30 hover:bg-purple-700/20';
        row.innerHTML = `
            <td class="p-4">${product.name}</td>
            <td class="p-4 text-center">${product.stock}</td>
            <td class="p-4 text-center">${formatCurrency(product.price)}</td>
            <td class="p-4 text-center">
                <button data-id="${product.id}" class="add-to-sale-btn bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-lg">+</button>
            </td>
        `;
    });

    document.querySelectorAll('.add-to-sale-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const product = products.find(p => p.id === id);
            if (product && product.stock > 0) {
                const existingItem = currentSale.find(item => item.id === id);
                if (existingItem) {
                    existingItem.quantity++;
                } else {
                    currentSale.push({ ...product, quantity: 1 });
                }
                product.stock--;
                showToast(`Se ha añadido ${product.name} a la venta.`);
                saveData();
                renderAll();
            } else {
                showToast('Stock insuficiente.', 'error');
            }
        });
    });
}

function renderCurrentSale() {
    currentSaleTableBody.innerHTML = '';
    let total = 0;
    currentSale.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        const row = currentSaleTableBody.insertRow();
        row.className = 'border-t border-purple-500/30 hover:bg-purple-700/20';
        row.innerHTML = `
            <td class="p-4">${item.name}</td>
            <td class="p-4 text-center">${item.quantity}</td>
            <td class="p-4 text-center">${formatCurrency(item.price)}</td>
            <td class="p-4 text-right">${formatCurrency(subtotal)}</td>
            <td class="p-4">
                <button data-id="${item.id}" class="remove-from-sale-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg">-</button>
            </td>
        `;
    });
    saleTotalElement.textContent = formatCurrency(total);

    document.querySelectorAll('.remove-from-sale-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const existingItemIndex = currentSale.findIndex(item => item.id === id);
            if (existingItemIndex !== -1) {
                const product = products.find(p => p.id === id);
                if (product) {
                    product.stock++;
                    if (currentSale[existingItemIndex].quantity > 1) {
                        currentSale[existingItemIndex].quantity--;
                    } else {
                        currentSale.splice(existingItemIndex, 1);
                    }
                    showToast('Producto eliminado de la venta.');
                    saveData();
                    renderAll();
                }
            }
        });
    });
}

$('saleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (currentSale.length === 0) {
        showToast('No hay productos en la venta.', 'error');
        return;
    }

    const total = currentSale.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const profit = currentSale.reduce((sum, item) => sum + ((item.price - item.cost) * item.quantity), 0);
    const paymentMethod = $('salePaymentMethod').value;
    const sale = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        total: total,
        profit: profit,
        paymentMethod: paymentMethod,
        items: currentSale.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            cost: item.cost
        }))
    };
    salesHistory.push(sale);
    currentSale = [];
    showToast('Venta confirmada exitosamente.');
    saveData();
    renderAll();
});

$('saleProductSearch').addEventListener('input', renderAvailableProductsTable);

// Reportes
function renderReportsTable() {
    const tableBody = $('reportsTableBody');
    tableBody.innerHTML = '';
    const productSales = {};
    salesHistory.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSales[item.name]) {
                productSales[item.name] = {
                    unitsSold: 0,
                    totalSales: 0,
                    totalProfit: 0
                };
            }
            productSales[item.name].unitsSold += item.quantity;
            productSales[item.name].totalSales += item.price * item.quantity;
            productSales[item.name].totalProfit += (item.price - item.cost) * item.quantity;
        });
    });

    for (const name in productSales) {
        const row = tableBody.insertRow();
        row.className = 'border-t border-purple-500/30 hover:bg-purple-700/20';
        row.innerHTML = `
            <td class="p-4">${name}</td>
            <td class="p-4">${productSales[name].unitsSold}</td>
            <td class="p-4">${formatCurrency(productSales[name].totalSales)}</td>
            <td class="p-4">${formatCurrency(productSales[name].totalProfit)}</td>
        `;
    }
}

$('exportCsvBtn').addEventListener('click', () => {
    const data = [
        ['Producto', 'Unidades Vendidas', 'Ventas Totales', 'Ganancia Total']
    ];
    const productSales = {};
    salesHistory.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSales[item.name]) {
                productSales[item.name] = { unitsSold: 0, totalSales: 0, totalProfit: 0 };
            }
            productSales[item.name].unitsSold += item.quantity;
            productSales[item.name].totalSales += item.price * item.quantity;
            productSales[item.name].totalProfit += (item.price - item.cost) * item.quantity;
        });
    });
    for (const name in productSales) {
        data.push([
            name,
            productSales[name].unitsSold,
            productSales[name].totalSales,
            productSales[name].totalProfit
        ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_ventas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte exportado como CSV.');
});


// Balance
function renderBalanceCharts() {
    const categoryBalanceDiv = $('categoryBalance');
    const stockByCategory = {};
    products.forEach(product => {
        if (!stockByCategory[product.category]) {
            stockByCategory[product.category] = 0;
        }
        stockByCategory[product.category] += product.stock;
    });

    categoryBalanceDiv.innerHTML = '';
    for (const category in stockByCategory) {
        const div = document.createElement('div');
        div.className = 'glass-card p-4 flex justify-between items-center';
        div.innerHTML = `
            <span>${category}</span>
            <span class="font-bold">${stockByCategory[category]} unidades</span>
        `;
        categoryBalanceDiv.appendChild(div);
    }

    if (categoryStockChart) {
        categoryStockChart.destroy();
    }
    const stockLabels = Object.keys(stockByCategory);
    const stockData = Object.values(stockByCategory);
    const chartColors = [
        '#9333ea', '#c084fc', '#e879f9', '#f0abfc', '#a78bfa',
        '#d8b4fe', '#fbcfe8', '#8b5cf6', '#a5b4fc', '#c4b5fd'
    ];

    const ctx = $('categoryStockChart').getContext('2d');
    categoryStockChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: stockLabels,
            datasets: [{
                label: 'Stock por Categoría',
                data: stockData,
                backgroundColor: chartColors,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e2e8f0',
                        font: {
                            size: 14
                        }
                    }
                }
            }
        }
    });
}

// Historial
function renderHistoryTable() {
    const tableBody = $('historyTableBody');
    tableBody.innerHTML = '';
    salesHistory.sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha
    salesHistory.forEach(sale => {
        const row = tableBody.insertRow();
        row.className = 'border-t border-purple-500/30 hover:bg-purple-700/20';
        row.innerHTML = `
            <td class="p-4 text-xs">${sale.id.slice(-6)}</td>
            <td class="p-4 text-sm">${new Date(sale.date).toLocaleString()}</td>
            <td class="p-4 font-bold">${formatCurrency(sale.total)}</td>
            <td class="p-4">${formatCurrency(sale.profit)}</td>
            <td class="p-4">${sale.paymentMethod}</td>
            <td class="p-4">
                <button data-id="${sale.id}" class="details-btn bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-lg">Detalles</button>
                <button data-id="${sale.id}" class="delete-history-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg">Eliminar</button>
            </td>
        `;
    });
    document.querySelectorAll('.delete-history-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            promptForPassword(() => {
                salesHistory = salesHistory.filter(s => s.id !== id);
                showToast('Venta eliminada del historial.', 'error');
                saveData();
                renderAll();
            });
        });
    });
}

// Reiniciar ventas del día
$('resetDailySalesBtn').addEventListener('click', () => {
    promptForPassword(() => {
        currentSale = [];
        showToast('Ventas del día reiniciadas.');
        saveData();
        renderAll();
    });
});

renderAll();

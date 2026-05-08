// ============================================================
// Bfashion SV — script.js  (versión corregida)
// ============================================================
// URL única del Apps Script deployment (doGet + doPost)
// ============================================================
var GAS_URL = "https://script.google.com/macros/s/AKfycbzpYoUe6n-ewqXZexQ4-O7cNTS8WJNPznVZh7zy45-aZFUUONmpDEHZHlWv8RF1FNl1/exec";

// ============================================================
// CONFIGURACIÓN
// ============================================================
var AGENTES = {
  Agente1: {
    nombre: "Agente 1", telefono: "50375868428",
    cuentas: {
      efectivo:   { info: "Acordar en punto de encuentro" },
      agricola:   { numero: "0000-000000-0", nombre: "Agente Uno" },
      davivienda: { numero: "0000000000",    nombre: "Agente Uno" }
    }
  },
  Agente2: {
    nombre: "Agente 2", telefono: "50364615667",
    cuentas: {
      efectivo:   { info: "Acordar en punto de encuentro" },
      agricola:   { numero: "1111-111111-1", nombre: "Agente Dos" },
      davivienda: { numero: "1111111111",    nombre: "Agente Dos" }
    }
  },
  Agente3: {
    nombre: "Agente 3", telefono: "50371162166",
    cuentas: {
      efectivo:   { info: "Acordar en punto de encuentro" },
      agricola:   { numero: "2222-222222-2", nombre: "Agente Tres" },
      davivienda: { numero: "2222222222",    nombre: "Agente Tres" }
    }
  }
};

var URL_ADMIN     = "https://script.google.com/YOUR_ADMIN_URL";
var URL_AFILIADOS = "https://script.google.com/YOUR_AFILIADOS_URL";

var CREDENCIALES = {
  admin:    [{ user: "admin",     pass: "Bfas2025!" }],
  afiliado: [
    { user: "afiliado1", pass: "afil001" },
    { user: "afiliado2", pass: "afil002" },
    { user: "afiliado3", pass: "afil003" }
  ]
};

var CUPONES = {
  "BFAS2":       { tipo: "fijo",       valor: 2,    minimo: 10, maxDesc: null, usos: -1, clave: "BFAS2"       },
  "BFAS10OFF":   { tipo: "porcentaje", valor: 0.10, minimo: 15, maxDesc: 5,   usos: -1, clave: "BFAS10OFF"   },
  "ENVIOGRATIS": { tipo: "envio",      valor: 0,    minimo: 0,  maxDesc: null, usos: -1, clave: "ENVIOGRATIS" },
  "BIENVENIDO":  { tipo: "porcentaje", valor: 0.15, minimo: 8,  maxDesc: 3,   usos: 1,  clave: "BIENVENIDO"  }
};

// ============================================================
// ESTADO GLOBAL
// ============================================================
var allProducts = [], filteredProducts = [], currentCat = "todas";
var cart = [], couponApplied = null, envioPrice = 0;
var selectedAgent = null, selectedDelivery = null, selectedPayment = null, currentStep = 0;
var loginType = "";
var modalProduct = null, modalQty = 1, modalColor = "", modalTalla = "";

// ============================================================
// INIT
// ============================================================
window.addEventListener("load", function () {
  loadCartFromStorage();
  loadProducts();
});

// ============================================================
// CARGA DE PRODUCTOS
// Detecta si está en Apps Script (google.script.run) o en GitHub Pages (fetch)
// ============================================================
function loadProducts() {
  try {
    if (typeof google !== "undefined" && google.script && google.script.run) {
      // --- MODO APPS SCRIPT (HTML servido desde GAS) ---
      google.script.run
        .withSuccessHandler(function (res) {
          try {
            var d = (typeof res === "string") ? JSON.parse(res) : res;
            allProducts = (d && d.success) ? (d.products || []) : [];
            if (!d || !d.success) showToast("Error al cargar productos", "err");
          } catch (err) {
            console.error("Parse error:", err);
            showToast("Error procesando datos", "err");
            allProducts = [];
          }
          filteredProducts = allProducts.slice();
          renderProducts(filteredProducts);
          hideLoading();
        })
        .withFailureHandler(function (err) {
          console.error("GAS error:", err);
          fallbackProducts();
        })
        .getProductsClient();

    } else {
      // --- MODO GITHUB PAGES / WEB EXTERNA (fetch) ---
      // doGet responde action=getProducts en JSON
      fetch(GAS_URL + "?action=getProducts")
        .then(function (res) { return res.json(); })
        .then(function (d) {
          allProducts = (d && d.success) ? (d.products || []) : [];
          if (!d || !d.success) showToast("Error al cargar productos", "err");
          filteredProducts = allProducts.slice();
          renderProducts(filteredProducts);
          hideLoading();
        })
        .catch(function (err) {
          console.error("Fetch error (getProducts):", err);
          fallbackProducts();
        });
    }
  } catch (e) {
    console.error("loadProducts error:", e);
    fallbackProducts();
  }
}

// ============================================================
// FALLBACK — modo demo si el backend no responde
// ============================================================
function fallbackProducts() {
  allProducts = getDemoProducts();
  filteredProducts = allProducts.slice();
  renderProducts(filteredProducts);
  hideLoading();
}

function getDemoProducts() {
  return [
    { id:"1", nombre:"Collar Dorado Flor",          categoria:"collares",    precio:5.99,  stock:10, imagenURL:"", descripcion:"Hermoso collar dorado con dije de flor.",       colores:["Dorado","Plateado","Rosado"], tallas:[],                    activo:true, ultimaUnidad:false, pocasUnidades:false },
    { id:"2", nombre:"Auriculares Inalámbricos Pro", categoria:"auriculares", precio:18.99, stock:3,  imagenURL:"", descripcion:"Sonido de alta calidad, batería 20h.",          colores:["Negro","Blanco","Azul"],      tallas:[],                    activo:true, ultimaUnidad:false, pocasUnidades:true  },
    { id:"3", nombre:"Labial Mate Rosa",             categoria:"cosmeticos",  precio:4.50,  stock:1,  imagenURL:"", descripcion:"Larga duración, acabado mate perfecto.",        colores:["Rosa","Rojo","Nude"],         tallas:[],                    activo:true, ultimaUnidad:true,  pocasUnidades:false },
    { id:"4", nombre:"Vestido Floral Verano",        categoria:"mujer",       precio:22.00, stock:5,  imagenURL:"", descripcion:"Ligero y fresco, tela 100% algodón.",          colores:["Azul","Rosa","Verde"],        tallas:["XS","S","M","L","XL"], activo:true, ultimaUnidad:false, pocasUnidades:false },
    { id:"5", nombre:"Perfume Floral 100ml",         categoria:"cosmeticos",  precio:16.00, stock:8,  imagenURL:"", descripcion:"Fragancia floral fresca. Lleva 2 por $15 c/u.", colores:[],                            tallas:[],                    activo:true, ultimaUnidad:false, pocasUnidades:false },
    { id:"6", nombre:"Perfume Oriental 100ml",       categoria:"cosmeticos",  precio:16.00, stock:6,  imagenURL:"", descripcion:"Fragancia oriental sensual. Lleva 2 por $15.",  colores:[],                            tallas:[],                    activo:true, ultimaUnidad:false, pocasUnidades:false },
    { id:"7", nombre:"Camisa Casual Slim",           categoria:"hombre",      precio:14.99, stock:12, imagenURL:"", descripcion:"Slim fit, cómoda y elegante.",                 colores:["Blanco","Negro","Azul Marino"],tallas:["S","M","L","XL","XXL"], activo:true, ultimaUnidad:false, pocasUnidades:false },
    { id:"8", nombre:"Aretes de Cristal",            categoria:"accesorios",  precio:3.50,  stock:2,  imagenURL:"", descripcion:"Diseño elegante y moderno.",                   colores:["Transparente","Rosa","Azul"], tallas:[],                    activo:true, ultimaUnidad:false, pocasUnidades:true  }
  ];
}

function hideLoading() {
  var el = document.getElementById("loading");
  if (!el) return;
  el.classList.add("hidden");
  setTimeout(function () { el.style.display = "none"; }, 450);
}

// ============================================================
// RENDER PRODUCTOS
// ============================================================
function renderProducts(products) {
  var grid    = document.getElementById("products-grid");
  var noP     = document.getElementById("no-products");
  var countEl = document.getElementById("products-count");

  grid.querySelectorAll(".product-card").forEach(function (c) { c.remove(); });

  var visible = products.filter(function (p) { return p.stock > 0; });
  if (countEl) countEl.textContent = visible.length + " producto" + (visible.length !== 1 ? "s" : "");

  if (visible.length === 0) { noP.style.display = "block"; return; }
  noP.style.display = "none";

  visible.forEach(function (p) {
    var card = document.createElement("div");
    card.className = "product-card";

    var badge = "";
    if (p.ultimaUnidad)       badge = '<div class="product-badge badge-ultima">Última</div>';
    else if (p.pocasUnidades) badge = '<div class="product-badge badge-pocas">Pocas</div>';

    var imgHTML = p.imagenURL
      ? '<img class="product-img" src="' + escHtml(p.imagenURL) + '" alt="' + escHtml(p.nombre) + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=product-img-placeholder>🛍️</div>\'">'
      : '<div class="product-img-placeholder">🛍️</div>';

    var hint = "";
    if (p.ultimaUnidad)       hint = '<div class="card-stock-hint hint-ultima">Última unidad</div>';
    else if (p.pocasUnidades) hint = '<div class="card-stock-hint hint-pocas">Pocas unidades</div>';

    var ptag = isPerfume(p) ? '<span class="product-price-tag">2×$15</span>' : '';

    card.innerHTML =
      '<div class="product-img-wrap">' + badge + imgHTML + '</div>' +
      '<div class="product-info">' +
        '<div class="product-cat">'   + escHtml(p.categoria) + '</div>' +
        '<div class="product-name">'  + escHtml(p.nombre)    + '</div>' +
        '<div class="product-price-row"><div class="product-price">$' + parseFloat(p.precio).toFixed(2) + '</div>' + ptag + '</div>' +
        hint +
      '</div>';

    card.addEventListener("click", function () { openProductModal(p); });
    grid.appendChild(card);
  });
}

function escHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function isPerfume(p) { return (p.nombre || "").toLowerCase().indexOf("perfume") > -1 && parseFloat(p.precio) <= 16; }
function esRopa(p)    { return ["mujer","hombre","chicas","chicos","ropa"].indexOf((p.categoria || "").toLowerCase()) > -1; }

// ============================================================
// FILTROS
// ============================================================
function filterCat(cat, btn) {
  currentCat = cat;
  document.querySelectorAll(".cat-btn").forEach(function (b) { b.classList.remove("active"); });
  btn.classList.add("active");
  applyFilters();
}
function filterProducts() { applyFilters(); }
function applyFilters() {
  var q = (document.getElementById("search-input").value || "").toLowerCase().trim();
  filteredProducts = allProducts.filter(function (p) {
    if (p.stock <= 0) return false;
    var mC = currentCat === "todas" || (p.categoria || "").toLowerCase() === currentCat;
    var mQ = !q
      || (p.nombre      || "").toLowerCase().indexOf(q) > -1
      || (p.categoria   || "").toLowerCase().indexOf(q) > -1
      || (p.descripcion || "").toLowerCase().indexOf(q) > -1;
    return mC && mQ;
  });
  renderProducts(filteredProducts);
}

// ============================================================
// MODAL PRODUCTO — FULLSCREEN
// ============================================================
function openProductModal(product) {
  modalProduct = product; modalQty = 1; modalColor = ""; modalTalla = "";

  var imgWrap = document.getElementById("modal-img-wrap");
  var oldImg  = imgWrap.querySelector(".pmodal-img");
  if (oldImg) oldImg.remove();
  var ph = document.getElementById("modal-img-ph");

  if (product.imagenURL) {
    if (ph) ph.style.display = "none";
    var img = document.createElement("img");
    img.className = "pmodal-img";
    img.src = product.imagenURL;
    img.alt = product.nombre;
    img.onerror = function () { this.remove(); if (ph) ph.style.display = "flex"; };
    imgWrap.insertBefore(img, imgWrap.firstChild);
  } else {
    if (ph) { ph.style.display = "flex"; ph.textContent = "🛍️"; }
  }

  var bw = document.getElementById("modal-badge-wrap"); bw.innerHTML = "";
  if (product.ultimaUnidad)       bw.innerHTML = '<div class="product-badge badge-ultima">Última unidad</div>';
  else if (product.pocasUnidades) bw.innerHTML = '<div class="product-badge badge-pocas">Pocas unidades</div>';

  document.getElementById("modal-cat").textContent   = product.categoria || "";
  document.getElementById("modal-name").textContent  = product.nombre    || "";
  document.getElementById("modal-price").textContent = "$" + parseFloat(product.precio).toFixed(2);

  var sl = document.getElementById("modal-stock-label");
  if (product.ultimaUnidad)       { sl.textContent = "Última unidad";  sl.className = "pmodal-stock-label stock-ultima"; }
  else if (product.pocasUnidades) { sl.textContent = "Pocas unidades"; sl.className = "pmodal-stock-label stock-pocas"; }
  else { sl.textContent = ""; sl.className = "pmodal-stock-label"; }

  document.getElementById("modal-desc").textContent = product.descripcion || "Sin descripción.";

  // Colores
  var cw = document.getElementById("modal-colores-wrap");
  var cc = document.getElementById("modal-colores");
  var cs = document.getElementById("modal-color-sel");
  cc.innerHTML = ""; if (cs) cs.textContent = "";
  if (product.colores && product.colores.length > 0) {
    cw.style.display = "block";
    product.colores.forEach(function (c) {
      var b = document.createElement("div"); b.className = "color-swatch";
      var dot = document.createElement("div"); dot.className = "color-dot"; dot.style.background = colorToHex(c);
      b.appendChild(dot); b.appendChild(document.createTextNode(c));
      b.addEventListener("click", function () {
        cc.querySelectorAll(".color-swatch").forEach(function (s) { s.classList.remove("selected"); });
        b.classList.add("selected"); modalColor = c; if (cs) cs.textContent = "· " + c;
      });
      cc.appendChild(b);
    });
  } else { cw.style.display = "none"; }

  // Tallas
  var tw = document.getElementById("modal-tallas-wrap");
  var tc = document.getElementById("modal-tallas");
  var ts = document.getElementById("modal-talla-sel");
  tc.innerHTML = ""; if (ts) ts.textContent = "";
  if (product.tallas && product.tallas.length > 0) {
    tw.style.display = "block";
    product.tallas.forEach(function (t) {
      var b = document.createElement("div"); b.className = "size-btn"; b.textContent = t;
      b.addEventListener("click", function () {
        tc.querySelectorAll(".size-btn").forEach(function (s) { s.classList.remove("selected"); });
        b.classList.add("selected"); modalTalla = t; if (ts) ts.textContent = "· " + t;
      });
      tc.appendChild(b);
    });
  } else { tw.style.display = "none"; }

  updateModalQtyUI();
  resetModalBtn();

  var scroll = document.getElementById("pmodal-scroll");
  if (scroll) scroll.scrollTop = 0;

  document.getElementById("product-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("open");
  document.body.style.overflow = "";
  modalProduct = null;
}

function changeModalQty(delta) {
  if (!modalProduct) return;
  var enC = 0;
  cart.forEach(function (it) { if (String(it.id) === String(modalProduct.id)) enC += it.cantidad; });
  var disp = modalProduct.stock - enC;
  var nq   = Math.max(1, Math.min(modalQty + delta, disp));
  modalQty = nq;
  updateModalQtyUI();
}

function updateModalQtyUI() {
  if (!modalProduct) return;
  var enC = 0;
  cart.forEach(function (it) { if (String(it.id) === String(modalProduct.id)) enC += it.cantidad; });
  var disp = modalProduct.stock - enC;
  document.getElementById("modal-qty").textContent  = modalQty;
  document.getElementById("qty-minus").disabled = modalQty <= 1;
  document.getElementById("qty-plus").disabled  = modalQty >= disp;
  var note = document.getElementById("modal-stock-note");
  if (note) {
    if (disp <= 0) { note.textContent = "Agotado en carrito"; note.style.color = "var(--red)"; }
    else { note.textContent = disp + " disponible" + (disp !== 1 ? "s" : ""); note.style.color = disp <= 3 ? "var(--red)" : "var(--gray)"; }
  }
}

function resetModalBtn() {
  var b = document.getElementById("btn-add-modal");
  var t = document.getElementById("btn-add-modal-text");
  if (b) { b.disabled = false; b.className = "btn-add-modal"; }
  if (t) t.textContent = "Agregar al carrito";
}

function colorToHex(n) {
  var m = { "negro":"#111","blanco":"#fff","rojo":"#e53935","azul":"#1e88e5","verde":"#43a047","rosa":"#e91e63","amarillo":"#fdd835","naranja":"#fb8c00","morado":"#8e24aa","gris":"#9e9e9e","dorado":"#ffc107","plateado":"#bdbdbd","nude":"#d4a574","beige":"#f5deb3","celeste":"#00bcd4","transparente":"#e0e0e0","azul marino":"#1a237e","rosado":"#f48fb1","cafe":"#795548","turquesa":"#009688","coral":"#ff7043","lila":"#ce93d8" };
  return m[(n || "").toLowerCase()] || "#ccc";
}

function addFromModal() {
  if (!modalProduct) return;
  if (modalProduct.stock <= 0) { showToast("Producto agotado", "err"); return; }

  var enC = 0;
  cart.forEach(function (it) { if (String(it.id) === String(modalProduct.id)) enC += it.cantidad; });
  if (enC >= modalProduct.stock) { showToast("No hay más unidades disponibles", "err"); return; }

  var tieneC = modalProduct.colores && modalProduct.colores.length > 0;
  var tieneT = modalProduct.tallas  && modalProduct.tallas.length  > 0;
  if (tieneC && !modalColor) { showToast("Selecciona un color", "warn"); return; }
  if (tieneT && !modalTalla) { showToast("Selecciona una talla", "warn"); return; }

  var precio = parseFloat(modalProduct.precio);
  if (isPerfume(modalProduct)) {
    var totalP = 0;
    cart.forEach(function (it) { if (isPerfume(it)) totalP += it.cantidad; });
    if (totalP + modalQty >= 2) {
      cart.forEach(function (it) { if (isPerfume(it)) it.precio = 15; });
      precio = 15;
      showToast("¡2 perfumes por $15 c/u!", "ok");
    }
  }

  var existente = null;
  cart.forEach(function (it) {
    if (String(it.id) === String(modalProduct.id) && it.color === modalColor && it.talla === modalTalla) existente = it;
  });
  if (existente) { existente.cantidad += modalQty; existente.precio = precio; }
  else cart.push({
    id:         modalProduct.id,
    nombre:     modalProduct.nombre,
    categoria:  modalProduct.categoria,
    precio:     precio,
    cantidad:   modalQty,
    imagenURL:  modalProduct.imagenURL,
    color:      modalColor,
    talla:      modalTalla
  });

  saveCartToStorage();
  updateCartUI();

  var b = document.getElementById("btn-add-modal");
  var t = document.getElementById("btn-add-modal-text");
  if (b) { b.classList.add("added"); b.disabled = true; }
  if (t) t.textContent = "¡Agregado! ✓";

  var badge = document.getElementById("cart-badge");
  if (badge) { badge.classList.add("bump"); setTimeout(function () { badge.classList.remove("bump"); }, 300); }

  setTimeout(function () { closeProductModal(); resetModalBtn(); }, 850);
}

// ============================================================
// CARRITO
// ============================================================
function removeFromCart(i) {
  cart.splice(i, 1);
  recalcPerfumes();
  saveCartToStorage();
  updateCartUI();
}

function changeQty(i, d) {
  var item = cart[i]; if (!item) return;
  var p    = allProducts.find(function (pr) { return String(pr.id) === String(item.id); });
  var max  = p ? p.stock : 99;
  var nq   = item.cantidad + d;
  if (nq <= 0) { removeFromCart(i); return; }
  if (nq > max) { showToast("No hay más unidades", "warn"); return; }
  item.cantidad = nq;
  recalcPerfumes();
  saveCartToStorage();
  updateCartUI();
}

function recalcPerfumes() {
  var tot = 0;
  cart.forEach(function (it) { if (isPerfume(it)) tot += it.cantidad; });
  cart.forEach(function (it) { if (isPerfume(it)) it.precio = tot >= 2 ? 15 : 16; });
}

function calcSubtotal() {
  var s = 0;
  cart.forEach(function (it) { s += it.precio * it.cantidad; });
  return parseFloat(s.toFixed(2));
}

function calcDescuento(sub) {
  if (!couponApplied) return 0;
  var c = couponApplied, d = 0;
  if (c.tipo === "fijo")       d = c.valor;
  else if (c.tipo === "porcentaje") { d = sub * c.valor; if (c.maxDesc) d = Math.min(d, c.maxDesc); }
  return parseFloat(d.toFixed(2));
}

function calcTotal() {
  var s = calcSubtotal();
  var d = calcDescuento(s);
  var e = (couponApplied && couponApplied.tipo === "envio") ? 0 : envioPrice;
  return parseFloat(Math.max(0, s - d + e).toFixed(2));
}

function updateCartUI() {
  var count = 0;
  cart.forEach(function (it) { count += it.cantidad; });
  var badge = document.getElementById("cart-badge");
  if (badge) badge.textContent = count;

  var itemsEl = document.getElementById("cart-items");
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<div class="cart-empty"><span class="empty-icon">🛍️</span><p>Tu carrito está vacío</p><span class="hint">Agrega productos para continuar</span></div>';
  } else {
    var html = "";
    cart.forEach(function (item, idx) {
      var imgEl = item.imagenURL
        ? '<img class="cart-item-img" src="' + escHtml(item.imagenURL) + '" onerror="this.style.display=\'none\'">'
        : '<div class="cart-item-img-ph">🛍️</div>';
      var vi = [item.color, item.talla].filter(Boolean).join(" · ");
      html +=
        '<div class="cart-item">' + imgEl +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">'  + escHtml(item.nombre) + '</div>' +
          (vi ? '<div class="cart-item-variant">' + escHtml(vi) + '</div>' : '') +
          '<div class="cart-item-price">$' + (item.precio * item.cantidad).toFixed(2) + '</div>' +
        '</div>' +
        '<div class="cart-item-controls">' +
          '<button class="btn-remove-item" onclick="removeFromCart(' + idx + ')">🗑</button>' +
          '<div class="cart-qty-row">' +
            '<button class="qty-btn" onclick="changeQty(' + idx + ',-1)">−</button>' +
            '<span class="qty-val">' + item.cantidad + '</span>' +
            '<button class="qty-btn" onclick="changeQty(' + idx + ',1)">+</button>' +
          '</div>' +
        '</div></div>';
    });
    itemsEl.innerHTML = html;
  }

  var s   = calcSubtotal();
  var d   = calcDescuento(s);
  var e   = (couponApplied && couponApplied.tipo === "envio") ? 0 : envioPrice;
  var tot = calcTotal();
  var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
  set("subtotal-val",  "$"  + s.toFixed(2));
  set("descuento-val", "−$" + d.toFixed(2));
  set("envio-val",     e === 0 ? "Gratis" : "$" + e.toFixed(2));
  set("total-val",     "$"  + tot.toFixed(2));
  var dr = document.getElementById("descuento-row");
  if (dr) dr.style.display = d > 0 ? "flex" : "none";
}

function saveCartToStorage() {
  try { localStorage.setItem("mixy_cart", JSON.stringify(cart)); } catch (e) {}
}
function loadCartFromStorage() {
  try {
    var r = localStorage.getItem("mixy_cart");
    if (r) cart = JSON.parse(r);
  } catch (e) { cart = []; }
  updateCartUI();
}

// ============================================================
// CUPONES
// ============================================================
function applyCoupon() {
  var code  = (document.getElementById("coupon-input").value || "").trim().toUpperCase();
  var msgEl = document.getElementById("coupon-msg");
  if (!code) { setMsg(msgEl, "Ingresa un código", "err"); return; }
  var c = CUPONES[code];
  if (!c) { setMsg(msgEl, "Cupón no válido ❌", "err"); couponApplied = null; updateCartUI(); return; }
  if (c.usos === 1) {
    try {
      var u = JSON.parse(localStorage.getItem("mixy_cupones_usados") || "[]");
      if (u.indexOf(code) > -1) { setMsg(msgEl, "Este cupón ya fue usado", "err"); couponApplied = null; updateCartUI(); return; }
    } catch (e) {}
  }
  var sub = calcSubtotal();
  if (sub < (c.minimo || 0)) { setMsg(msgEl, "Mínimo: $" + c.minimo, "err"); couponApplied = null; updateCartUI(); return; }
  couponApplied = c;
  var d = calcDescuento(sub);
  setMsg(msgEl, c.tipo === "envio" ? "¡Envío gratis! 🎉" : "¡Ahorras $" + d.toFixed(2) + "! ✅", "ok");
  updateCartUI();
}
function setMsg(el, msg, t) {
  if (!el) return;
  el.textContent = msg;
  el.className   = t === "ok" ? "msg-ok" : "msg-err";
}

// ============================================================
// PANEL DEL CARRITO
// ============================================================
function openCart() {
  document.getElementById("cart-panel").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  document.getElementById("cart-panel").classList.remove("open");
  document.body.style.overflow = "";
}

// ============================================================
// CHECKOUT — PASOS
// ============================================================
function continueCheckout() {
  if (cart.length === 0) { showToast("Tu carrito está vacío", "warn"); return; }
  closeCart();
  currentStep    = 0;
  selectedAgent  = null;
  selectedDelivery = null;
  selectedPayment  = null;
  renderStep(0);
  document.getElementById("checkout-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function renderStep(s) {
  document.querySelectorAll(".checkout-section").forEach(function (el) { el.classList.remove("active"); });
  var el = document.getElementById("step-" + s);
  if (el) el.classList.add("active");
  for (var i = 0; i < 4; i++) {
    var dot = document.getElementById("step-dot-" + i);
    if (dot) dot.classList.toggle("active", i === s);
  }
  var titulos = ["Seleccionar Agente","Método de Entrega","Método de Pago","Tus Datos"];
  document.getElementById("checkout-title").textContent = titulos[s] || "";
  currentStep = s;
}

function goToStep(s) {
  if (s === 1 && !selectedAgent)    { showToast("Selecciona un agente",           "warn"); return; }
  if (s === 2 && !selectedDelivery) { showToast("Selecciona método de entrega",   "warn"); return; }
  if (s === 3 && !selectedPayment)  { showToast("Selecciona método de pago",      "warn"); return; }
  renderStep(s);
}

function selectAgent(a, btn) {
  document.querySelectorAll(".agent-btn").forEach(function (b) { b.classList.remove("selected"); });
  btn.classList.add("selected");
  selectedAgent = a;
  renderPaymentOpts(a);
}

function selectDelivery(nombre, precio, el) {
  document.querySelectorAll(".delivery-opt").forEach(function (e) { e.classList.remove("selected"); });
  el.classList.add("selected");
  selectedDelivery = nombre;
  envioPrice = parseFloat(precio) || 0;
  updateCartUI();
}

function renderPaymentOpts(a) {
  var opts = document.getElementById("payment-opts"); if (!opts) return;
  var info = AGENTES[a];                              if (!info) return;
  var h =
    '<div class="payment-opt" onclick="selectPayment(\'Efectivo\',this)">' +
      '<div class="payment-opt-title">Efectivo</div>' +
      '<div class="payment-account">' + escHtml(info.cuentas.efectivo.info) + '</div>' +
    '</div>' +
    '<div class="payment-opt" onclick="selectPayment(\'Banco Agrícola\',this)">' +
      '<div class="payment-opt-title">Banco Agrícola</div>' +
      '<div class="payment-account">Cuenta: ' + escHtml(info.cuentas.agricola.numero) + '</div>' +
      '<div class="payment-account">A nombre de: ' + escHtml(info.cuentas.agricola.nombre) + '</div>' +
    '</div>' +
    '<div class="payment-opt" onclick="selectPayment(\'Davivienda\',this)">' +
      '<div class="payment-opt-title">Davivienda</div>' +
      '<div class="payment-account">Cuenta: ' + escHtml(info.cuentas.davivienda.numero) + '</div>' +
      '<div class="payment-account">A nombre de: ' + escHtml(info.cuentas.davivienda.nombre) + '</div>' +
    '</div>';
  opts.innerHTML   = h;
  selectedPayment  = null;
}

function selectPayment(m, el) {
  document.querySelectorAll(".payment-opt").forEach(function (e) { e.classList.remove("selected"); });
  el.classList.add("selected");
  selectedPayment = m;
}

// ============================================================
// CONFIRMACIÓN DEL PEDIDO
// ============================================================
// CORRECCIÓN PRINCIPAL: el fetch y sendWA estaban fuera de esta función,
// ejecutándose al cargar la página. Ahora todo el flujo vive aquí dentro.
// ============================================================
function confirmOrder() {
  // --- Leer formulario ---
  var nombre  = (document.getElementById("f-nombre").value    || "").trim();
  var tel     = (document.getElementById("f-telefono").value  || "").trim();
  var dir     = (document.getElementById("f-direccion").value || "").trim();
  var correo  = (document.getElementById("f-correo").value    || "").trim();

  if (!nombre) { showToast("Ingresa tu nombre",    "err"); return; }
  if (!tel)    { showToast("Ingresa tu teléfono",  "err"); return; }
  if (!selectedAgent || !selectedDelivery || !selectedPayment || cart.length === 0) {
    showToast("Completa todos los pasos", "err");
    return;
  }

  var total = calcTotal();
  var items = cart.map(function (it) {
    return {
      id:        it.id,
      nombre:    it.nombre,
      categoria: it.categoria,
      precio:    it.precio,
      cantidad:  it.cantidad,
      color:     it.color  || "",
      talla:     it.talla  || ""
    };
  });

  var orderData = {
    action:         "createOrder",   // campo que lee doPost en Code.gs
    nombre:         nombre,
    telefono:       tel,
    direccion:      dir,
    correo:         correo,
    items:          items,
    total:          total,
    metodoEntrega:  selectedDelivery,
    metodoPago:     selectedPayment,
    agente:         selectedAgent
  };

  // --- Bloquear botón mientras procesa ---
  var btn = document.querySelector(".btn-whatsapp");
  if (btn) { btn.disabled = true; btn.innerHTML = "⏳ Procesando..."; }

  // ============================================================
  // sendWA — abre WhatsApp con el resumen del pedido
  // Definida DENTRO de confirmOrder para acceder a las variables locales
  // ============================================================
  function sendWA(idPedido) {
    var agInfo = AGENTES[selectedAgent];
    var waTel  = agInfo ? agInfo.telefono : "50300000000";

    var sub  = calcSubtotal();
    var desc = calcDescuento(sub);
    var envP = (couponApplied && couponApplied.tipo === "envio") ? 0 : envioPrice;

    var iTexto = items.map(function (it) {
      var v = [it.color, it.talla].filter(Boolean).join("/");
      return "• " + it.nombre + (v ? " (" + v + ")" : "") +
             " x" + it.cantidad + " = $" + (parseFloat(it.precio) * parseInt(it.cantidad)).toFixed(2);
    }).join("\n");

    var msg =
      "🛍️ *PEDIDO Bfashion For Life*\n\n" +
      "📋 *ID:* "      + idPedido + "\n" +
      "📅 *Fecha:* "   + new Date().toLocaleDateString("es-SV") + "\n\n" +
      "👤 *Cliente:* " + nombre   + "\n" +
      "📞 *Teléfono:* "+ tel      +
      (dir ? "\n📍 *Dirección:* " + dir : "") + "\n\n" +
      "🛒 *Productos:*\n" + iTexto +
      (desc > 0 ? "\n\n🎟️ *Descuento:* -$" + desc.toFixed(2) : "") +
      "\n🚚 *Envío:* "  + (envP > 0 ? "$" + envP.toFixed(2) : "Gratis") +
      "\n💵 *TOTAL:* $" + total.toFixed(2) + "\n\n" +
      "📦 *Entrega:* " + selectedDelivery + "\n" +
      "💳 *Pago:* "    + selectedPayment  + "\n\n" +
      "¡Gracias por tu compra en Bfashion SV! 💕";

    // Abrir WhatsApp (ventana nueva antes del reset para evitar bloqueo en móvil)
    window.open("https://wa.me/" + waTel + "?text=" + encodeURIComponent(msg), "_blank");

    // Marcar cupón de un solo uso
    if (couponApplied && couponApplied.usos === 1) {
      try {
        var u = JSON.parse(localStorage.getItem("mixy_cupones_usados") || "[]");
        u.push(couponApplied.clave);
        localStorage.setItem("mixy_cupones_usados", JSON.stringify(u));
      } catch (e2) {}
    }

    // Actualizar stock local (la hoja ya fue actualizada por el backend)
    items.forEach(function (it) {
      var p = allProducts.find(function (pr) { return String(pr.id) === String(it.id); });
      if (p) {
        p.stock        = Math.max(0, p.stock - it.cantidad);
        p.ultimaUnidad = p.stock === 1;
        p.pocasUnidades = p.stock > 1 && p.stock <= 3;
      }
    });

    // Limpiar estado
    cart          = [];
    couponApplied = null;
    envioPrice    = 0;
    saveCartToStorage();
    updateCartUI();

    // Cerrar checkout
    document.getElementById("checkout-modal").classList.remove("open");
    document.body.style.overflow = "";

    // Limpiar formulario
    ["f-nombre","f-telefono","f-direccion","f-correo"].forEach(function (fid) {
      var fe = document.getElementById(fid); if (fe) fe.value = "";
    });

    showToast("¡Pedido enviado! 🎉", "ok");

    // Restaurar botón
    if (btn) {
      btn.disabled = false;
      btn.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
        '</svg> Confirmar y enviar por WhatsApp';
    }
  }

  // ============================================================
  // POST a doPost de Code.gs
  // URL única: GAS_URL — el mismo deployment sirve GET y POST
  // Body: JSON serializado con action="createOrder" + datos del pedido
  // ============================================================
  fetch(GAS_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    "data=" + encodeURIComponent(JSON.stringify(orderData))
  })
  .then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  })
  .then(function (d) {
    if (d && d.success) {
      // Backend OK → abrir WhatsApp con el ID real del pedido
      sendWA(d.idPedido || ("ORD-" + Date.now()));
    } else {
      // Backend reportó error (stock, validación, etc.)
      var msg = (d && d.error) ? d.error : "Error desconocido. Intenta de nuevo.";
      showToast("Error: " + msg, "err");
      if (btn) { btn.disabled = false; btn.textContent = "Confirmar y enviar por WhatsApp"; }
    }
  })
  .catch(function (err) {
    // Error de red o timeout
    console.error("[confirmOrder] Fetch error:", err);
    showToast("Error de conexión. Verifica tu internet.", "err");
    if (btn) { btn.disabled = false; btn.textContent = "Confirmar y enviar por WhatsApp"; }
  });
}

// ============================================================
// UI HELPERS
// ============================================================
function openMenu() {
  document.getElementById("menu-dropdown").classList.add("open");
  document.getElementById("menu-overlay").classList.add("open");
}
function closeMenu() {
  document.getElementById("menu-dropdown").classList.remove("open");
  document.getElementById("menu-overlay").classList.remove("open");
}
function openUbicacionCedros() {
  window.open("https://maps.google.com/?q=Cedros,+Caceres,+El+Salvador", "_blank");
}
function openLogin(type) {
  loginType = type;
  closeMenu();
  document.getElementById("login-title").textContent = type === "admin" ? "Login Admin" : "Login Afiliado";
  ["login-user","login-pass"].forEach(function (id) {
    var e = document.getElementById(id); if (e) e.value = "";
  });
  document.getElementById("login-error").textContent = "";
  document.getElementById("login-modal").classList.add("open");
}
function closeLogin() { document.getElementById("login-modal").classList.remove("open"); }
function doLogin() {
  var u     = (document.getElementById("login-user").value || "").trim();
  var p     = (document.getElementById("login-pass").value || "").trim();
  var errEl = document.getElementById("login-error");
  var lista = loginType === "admin" ? CREDENCIALES.admin : CREDENCIALES.afiliado;
  var m     = lista.find(function (c) { return c.user === u && c.pass === p; });
  if (m) { closeLogin(); window.open(loginType === "admin" ? URL_ADMIN : URL_AFILIADOS, "_blank"); }
  else   { errEl.textContent = "Usuario o contraseña incorrectos ❌"; }
}

function showToast(msg, type) {
  var c = document.getElementById("toast-container");
  if (!c) return;
  var t = document.createElement("div");
  t.className   = "toast " + (type || "");
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(function () {
    t.style.opacity    = "0";
    t.style.transition = "opacity .3s";
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
  }, 2800);
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

// ============================================================
// EVENTOS GLOBALES
// ============================================================
document.getElementById("checkout-modal").addEventListener("click", function (e) {
  if (e.target === this) { this.classList.remove("open"); document.body.style.overflow = ""; }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeProductModal();
    closeCart();
    closeMenu();
    closeLogin();
    var cm = document.getElementById("checkout-modal");
    if (cm) { cm.classList.remove("open"); document.body.style.overflow = ""; }
  }
});

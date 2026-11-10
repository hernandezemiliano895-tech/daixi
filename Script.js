(() => {
  "use strict";

  const STORAGE_KEYS = {
    users: "daixi.users",
    appointments: "daixi.appointments",
    memberships: "daixi.memberships",
    cart: "daixi.cart",
    orders: "daixi.orders"
  };
  const PRODUCTS = [
    { id: "aceite-calma", name: "Aceite calma", price: 480 },
    { id: "vela-ritual", name: "Vela ritual", price: 390 },
    { id: "exfoliante-suave", name: "Exfoliante suave", price: 520 },
    { id: "infusion-descanso", name: "Infusión descanso", price: 260 }
  ];
  const THERAPISTS = ["Jessica", "Ximena"];
  const ADMIN_PROFILES = [
    { email: "jessica@daixi.com", password: "JessicaDaixi2026!", firstName: "Jessica" },
    { email: "emilio@daixi.com", password: "EmilioDaixi2026!", firstName: "Emilio" }
  ];
  let users = [];
  let appointments = [];
  let memberships = [];
  let orders = [];
  let cart = {};
  let currentUser = null;
  let storageReady = true;
  let toastTimer;

  const byId = (id) => document.getElementById(id);
  const accountDialog = byId("accountDialog");
  const authMessage = byId("authMessage");
  const toast = byId("toast");

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 4200);
  }

  function requireStorage() {
    if (!storageReady) {
      showToast("No se pueden guardar datos en este navegador. Habilita el almacenamiento e inténtalo de nuevo.");
      return false;
    }
    return true;
  }

  function readCollection(key) {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return [];
    const value = JSON.parse(stored);
    if (!Array.isArray(value)) throw new Error(`El contenido almacenado en ${key} no es una lista válida.`);
    return value;
  }

  function saveCollection(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("No se pudieron guardar los datos de Daixi.", error);
      storageReady = false;
      showToast("No pudimos guardar tus datos. Revisa el almacenamiento del navegador e inténtalo de nuevo.");
      return false;
    }
  }

  function cartStorageKey(user = currentUser) {
    if (!user) return STORAGE_KEYS.cart;
    return `${STORAGE_KEYS.cart}.${encodeURIComponent(user.email.toLowerCase())}`;
  }

  function readCart(key = cartStorageKey()) {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return {};
    const value = JSON.parse(stored);
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("El carrito guardado no es válido.");
    return Object.fromEntries(Object.entries(value).filter(([id, quantity]) =>
      PRODUCTS.some((product) => product.id === id) && Number.isInteger(quantity) && quantity > 0
    ));
  }

  function saveCart(nextCart) {
    try {
      window.localStorage.setItem(cartStorageKey(), JSON.stringify(nextCart));
      cart = nextCart;
      return true;
    } catch (error) {
      console.error("No se pudo guardar el carrito de Daixi.", error);
      showToast("No pudimos actualizar tu carrito. Revisa el almacenamiento del navegador e inténtalo de nuevo.");
      return false;
    }
  }

  function switchUser(user) {
    let nextCart;
    try {
      nextCart = readCart(cartStorageKey(user));
    } catch (error) {
      console.error("No se pudo leer el carrito de la cuenta.", error);
      storageReady = false;
      showToast("No pudimos cargar el carrito de esta cuenta. Revisa el almacenamiento del navegador.");
      return false;
    }
    currentUser = user;
    cart = nextCart;
    renderCart();
    renderSession();
    return true;
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(amount);
  }

  function renderCart() {
    const cartItems = byId("cartItems");
    cartItems.replaceChildren();
    const entries = PRODUCTS.filter((product) => cart[product.id]).map((product) => ({
      ...product,
      quantity: cart[product.id]
    }));
    const itemCount = entries.reduce((sum, item) => sum + item.quantity, 0);
    const total = entries.reduce((sum, item) => sum + item.price * item.quantity, 0);
    byId("cartCount").textContent = String(itemCount);
    byId("cartCount").classList.toggle("hidden", itemCount === 0);
    byId("cartEmpty").classList.toggle("hidden", itemCount > 0);
    byId("cartSummary").classList.toggle("hidden", itemCount === 0);
    byId("checkoutButton").disabled = itemCount === 0;
    byId("cartSubtotal").textContent = formatMoney(total);
    byId("cartTotal").textContent = `${formatMoney(total)} MXN`;

    entries.forEach((item) => {
      const row = document.createElement("article");
      row.className = "cart-item";
      const details = document.createElement("div");
      details.className = "cart-item-details";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const price = document.createElement("span");
      price.textContent = `${formatMoney(item.price)} c/u`;
      details.append(name, price);

      const controls = document.createElement("div");
      controls.className = "quantity-controls";
      const decrease = document.createElement("button");
      decrease.type = "button";
      decrease.dataset.cartAction = "decrease";
      decrease.dataset.product = item.id;
      decrease.setAttribute("aria-label", `Quitar una unidad de ${item.name}`);
      decrease.textContent = "−";
      const quantity = document.createElement("span");
      quantity.textContent = String(item.quantity);
      const increase = document.createElement("button");
      increase.type = "button";
      increase.dataset.cartAction = "increase";
      increase.dataset.product = item.id;
      increase.setAttribute("aria-label", `Agregar una unidad de ${item.name}`);
      increase.textContent = "+";
      controls.append(decrease, quantity, increase);

      const lineTotal = document.createElement("strong");
      lineTotal.className = "cart-item-total";
      lineTotal.textContent = formatMoney(item.price * item.quantity);
      row.append(details, controls, lineTotal);
      cartItems.append(row);
    });
  }

  try {
    users = readCollection(STORAGE_KEYS.users);
    appointments = readCollection(STORAGE_KEYS.appointments);
    memberships = readCollection(STORAGE_KEYS.memberships);
    orders = readCollection(STORAGE_KEYS.orders);
    cart = readCart();
  } catch (error) {
    console.error("No se pudieron leer los datos de Daixi.", error);
    storageReady = false;
    window.setTimeout(() => showToast("No pudimos leer los datos guardados. Revisa el almacenamiento de este navegador."), 0);
  }

  function setAuthMessage(message, isSuccess) {
    authMessage.textContent = message;
    authMessage.classList.toggle("success", Boolean(isSuccess));
  }

  function setAuthMode(mode) {
    const isLogin = mode === "login";
    byId("loginForm").classList.toggle("hidden", !isLogin);
    byId("registerForm").classList.toggle("hidden", isLogin);
    byId("loginTab").classList.toggle("active", isLogin);
    byId("registerTab").classList.toggle("active", !isLogin);
    byId("loginTab").setAttribute("aria-selected", String(isLogin));
    byId("registerTab").setAttribute("aria-selected", String(!isLogin));
    byId("dialogTitle").innerHTML = isLogin ? "Un momento <em>para ti.</em>" : "Tu espacio <em>empieza aquí.</em>";
    setAuthMessage("", false);
  }

  function openAccount(mode) {
    setAuthMode(mode);
    if (!accountDialog.open) accountDialog.showModal();
  }

  function renderAdmin() {
    byId("customerCount").textContent = String(users.length);
    byId("appointmentCount").textContent = String(appointments.length);
    byId("membershipCount").textContent = String(memberships.length);
    byId("orderCount").textContent = String(orders.length);

    const customerRows = byId("customerRows");
    customerRows.replaceChildren();
    [...users].reverse().forEach((user) => {
      const row = document.createElement("tr");
      [user.firstName + " " + user.lastName, user.email, user.phone, formatDate(user.createdAt)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      customerRows.append(row);
    });
    byId("emptyCustomers").classList.toggle("hidden", users.length > 0);

    const appointmentRows = byId("appointmentRows");
    appointmentRows.replaceChildren();
    [...appointments].reverse().forEach((appointment) => {
      const row = document.createElement("tr");
      const customer = users.find((user) => user.email === appointment.email);
      const values = [
        customer ? `${customer.firstName} ${customer.lastName}` : appointment.email,
        appointment.service,
        `${formatDate(appointment.date)} · ${appointment.time}`,
        appointment.therapist || "—"
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const status = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "status-pill";
      badge.textContent = "Solicitada";
      status.append(badge);
      row.append(status);
      appointmentRows.append(row);
    });
    byId("emptyAppointments").classList.toggle("hidden", appointments.length > 0);

    const membershipRows = byId("membershipRows");
    membershipRows.replaceChildren();
    [...memberships].reverse().forEach((membership) => {
      const row = document.createElement("tr");
      [membership.email, membership.phone || "—", formatDate(membership.createdAt)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const status = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "status-pill";
      badge.textContent = membership.status === "solicitada" ? "Solicitada" : (membership.status || "Solicitada");
      status.append(badge);
      row.append(status);
      membershipRows.append(row);
    });
    byId("emptyMemberships").classList.toggle("hidden", memberships.length > 0);

    const orderRows = byId("orderRows");
    orderRows.replaceChildren();
    [...orders].reverse().forEach((order) => {
      const row = document.createElement("tr");
      const products = order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ");
      [order.email, products, formatMoney(order.total)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const status = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "status-pill";
      badge.textContent = order.status || "Por confirmar";
      status.append(badge);
      row.append(status);
      orderRows.append(row);
    });
    byId("emptyOrders").classList.toggle("hidden", orders.length > 0);
  }

  function renderSession() {
    const isAdmin = currentUser && currentUser.role === "admin";
    const adminPanel = byId("adminPanel");
    adminPanel.classList.toggle("hidden", !isAdmin);
    byId("accountButton").classList.toggle("hidden", Boolean(currentUser));
    byId("logoutButton").classList.toggle("hidden", !currentUser);
    byId("welcomeUser").textContent = currentUser ? `Hola, ${currentUser.firstName}` : "";
    byId("adminName").textContent = isAdmin ? `${currentUser.firstName}.` : "Daixi.";
    if (isAdmin) renderAdmin();
  }

  function formatDate(dateString) {
    if (!dateString) return "—";
    const date = new Date(`${dateString}T00:00:00`);
    return Number.isNaN(date.getTime()) ? dateString : new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }

  function getToday() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function renderAvailabilityCalendar() {
    const calendar = byId("availabilityCalendar");
    calendar.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "calendar-heading";
    const monthTitle = document.createElement("strong");
    monthTitle.textContent = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(calendarMonth);
    const navigation = document.createElement("div");
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "calendar-nav";
    previous.textContent = "‹";
    previous.setAttribute("aria-label", "Mes anterior");
    previous.disabled = calendarMonth.getFullYear() === new Date().getFullYear() && calendarMonth.getMonth() === new Date().getMonth();
    previous.addEventListener("click", () => {
      calendarMonth.setMonth(calendarMonth.getMonth() - 1);
      renderAvailabilityCalendar();
    });
    const next = document.createElement("button");
    next.type = "button";
    next.className = "calendar-nav";
    next.textContent = "›";
    next.setAttribute("aria-label", "Mes siguiente");
    next.addEventListener("click", () => {
      calendarMonth.setMonth(calendarMonth.getMonth() + 1);
      renderAvailabilityCalendar();
    });
    navigation.append(previous, next);
    heading.append(monthTitle, navigation);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    ["L", "M", "X", "J", "V", "S", "D"].forEach((day) => {
      const weekday = document.createElement("span");
      weekday.className = "calendar-weekday";
      weekday.textContent = day;
      grid.append(weekday);
    });

    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    for (let index = 0; index < offset; index += 1) {
      const empty = document.createElement("span");
      empty.className = "calendar-day empty";
      grid.append(empty);
    }

    const bookedDates = new Set(appointments.map((appointment) => appointment.date));
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const value = dateKey(date);
      const isBooked = bookedDates.has(value);
      const isPast = value < getToday();
      const button = document.createElement("button");
      button.type = "button";
      button.className = `calendar-day ${isBooked ? "booked" : isPast ? "past" : "available"}`;
      if (byId("appointmentDate").value === value) button.classList.add("selected");
      button.textContent = String(day);
      button.setAttribute("aria-label", `${day}, ${isBooked ? "ocupado" : isPast ? "no disponible" : "disponible"}`);
      button.disabled = isBooked || isPast;
      button.addEventListener("click", () => {
        byId("appointmentDate").value = value;
        byId("appointmentDate").setCustomValidity("");
        renderAvailabilityCalendar();
      });
      grid.append(button);
    }
    calendar.append(heading, grid);
  }

  function validateAppointmentDate() {
    const dateField = byId("appointmentDate");
    const date = dateField.value;
    const isBooked = appointments.some((appointment) => appointment.date === date);
    dateField.setCustomValidity(isBooked ? "Esta fecha ya está ocupada. Elige otro día." : date && date < getToday() ? "Elige una fecha de hoy o posterior." : "");
    renderAvailabilityCalendar();
  }

  function assignTherapist() {
    const counts = THERAPISTS.map((therapist) =>
      appointments.filter((appointment) => appointment.therapist === therapist).length
    );
    if (counts[0] === counts[1]) return THERAPISTS[appointments.length % THERAPISTS.length];
    return counts[0] < counts[1] ? THERAPISTS[0] : THERAPISTS[1];
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  byId("currentYear").textContent = String(new Date().getFullYear());
  byId("appointmentDate").min = getToday();
  const calendarMonth = new Date();
  calendarMonth.setDate(1);
  calendarMonth.setHours(12, 0, 0, 0);
  byId("appointmentDate").addEventListener("input", validateAppointmentDate);
  byId("appointmentDate").addEventListener("change", validateAppointmentDate);
  renderAvailabilityCalendar();
  renderCart();
  renderSession();

  byId("menuToggle").addEventListener("click", () => {
    const isOpen = byId("mainNav").classList.toggle("open");
    byId("menuToggle").setAttribute("aria-expanded", String(isOpen));
    byId("menuToggle").setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  });
  byId("mainNav").addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      byId("mainNav").classList.remove("open");
      byId("menuToggle").setAttribute("aria-expanded", "false");
      byId("menuToggle").setAttribute("aria-label", "Abrir menú");
    }
  });

  byId("cartButton").addEventListener("click", () => {
    byId("checkoutForm").classList.add("hidden");
    byId("checkoutButton").classList.remove("hidden");
    byId("cartDialog").showModal();
  });
  byId("closeCart").addEventListener("click", () => byId("cartDialog").close());
  byId("cartDialog").addEventListener("click", (event) => {
    if (event.target === byId("cartDialog")) byId("cartDialog").close();
  });
  byId("cartItems").addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-action]");
    if (!button) return;
    const productId = button.dataset.product;
    const quantity = (cart[productId] || 0) + (button.dataset.cartAction === "increase" ? 1 : -1);
    const nextCart = { ...cart };
    if (quantity > 0) nextCart[productId] = quantity;
    else delete nextCart[productId];
    if (saveCart(nextCart)) renderCart();
  });
  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", () => {
      const product = PRODUCTS.find((item) => item.id === button.dataset.product);
      if (!product) {
        console.error("El producto seleccionado no está en el catálogo.", button.dataset.product);
        showToast("No pudimos agregar este producto. Inténtalo de nuevo.");
        return;
      }
      if (saveCart({ ...cart, [product.id]: (cart[product.id] || 0) + 1 })) {
        renderCart();
        showToast(`${product.name} se agregó a tu carrito.`);
      }
    });
  });
  byId("checkoutButton").addEventListener("click", () => {
    if (!Object.keys(cart).length) return;
    byId("checkoutForm").classList.remove("hidden");
    byId("checkoutButton").classList.add("hidden");
    if (currentUser && currentUser.role !== "admin") {
      byId("orderEmail").value = currentUser.email;
      byId("orderPhone").value = currentUser.phone || "";
    }
    byId("orderEmail").focus();
  });
  byId("checkoutForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireStorage() || !event.currentTarget.reportValidity()) return;
    const items = PRODUCTS.filter((product) => cart[product.id]).map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: cart[product.id]
    }));
    if (!items.length) return;
    const order = {
      email: byId("orderEmail").value.trim().toLowerCase(),
      phone: byId("orderPhone").value.trim(),
      items,
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      status: "Por confirmar",
      createdAt: new Date().toISOString()
    };
    const nextOrders = [...orders, order];
    if (!saveCollection(STORAGE_KEYS.orders, nextOrders)) return;
    orders = nextOrders;
    if (!saveCart({})) return;
    renderCart();
    renderSession();
    event.currentTarget.reset();
    byId("checkoutForm").classList.add("hidden");
    byId("checkoutButton").classList.remove("hidden");
    byId("cartDialog").close();
    showToast("Recibimos tu pedido. Daixi te contactará para confirmar disponibilidad y pago.");
  });

  byId("accountButton").addEventListener("click", () => openAccount("login"));
  byId("closeDialog").addEventListener("click", () => accountDialog.close());
  byId("loginTab").addEventListener("click", () => setAuthMode("login"));
  byId("registerTab").addEventListener("click", () => setAuthMode("register"));
  accountDialog.addEventListener("click", (event) => {
    if (event.target === accountDialog) accountDialog.close();
  });

  byId("registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireStorage()) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const email = byId("registerEmail").value.trim().toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === email)) {
      setAuthMessage("Este correo ya tiene una cuenta. Inicia sesión o usa otro correo.", false);
      byId("registerEmail").focus();
      return;
    }
    const user = {
      firstName: byId("registerFirstName").value.trim(),
      lastName: byId("registerLastName").value.trim(),
      email,
      phone: byId("registerPhone").value.trim(),
      password: byId("registerPassword").value,
      createdAt: new Date().toISOString()
    };
    const nextUsers = [...users, user];
    if (!saveCollection(STORAGE_KEYS.users, nextUsers)) return;
    users = nextUsers;
    if (!switchUser(user)) return;
    form.reset();
    accountDialog.close();
    showToast(`¡Bienvenida/o a Daixi, ${user.firstName}! Tu cuenta está lista.`);
  });

  byId("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireStorage()) return;
    const form = event.currentTarget;
    const emailInput = byId("loginEmail");
    const passwordInput = byId("loginPassword");
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    emailInput.setCustomValidity(isValidEmail(email) ? "" : "Ingresa un correo electrónico válido.");
    passwordInput.setCustomValidity(password.length >= 8 ? "" : "La contraseña debe tener al menos 8 caracteres.");
    if (!form.reportValidity()) return;
    const admin = ADMIN_PROFILES.find((profile) => profile.email === email && profile.password === password);
    if (admin) {
      const user = { ...admin, role: "admin" };
      if (!switchUser(user)) return;
      event.currentTarget.reset();
      accountDialog.close();
      byId("adminPanel").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const user = users.find((candidate) => candidate.email.toLowerCase() === email && candidate.password === password);
    if (!user) {
      setAuthMessage("Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.", false);
      return;
    }
    if (!switchUser(user)) return;
    event.currentTarget.reset();
    accountDialog.close();
    showToast(`¡Qué gusto verte, ${user.firstName}!`);
  });

  byId("logoutButton").addEventListener("click", () => {
    if (!switchUser(null)) return;
    showToast("Tu sesión se ha cerrado.");
  });

  byId("bookingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireStorage()) return;
    const form = event.currentTarget;
    const dateField = byId("appointmentDate");
    const date = dateField.value;
    validateAppointmentDate();
    if (!form.reportValidity()) return;
    if (!currentUser) {
      openAccount("login");
      setAuthMessage("Inicia sesión o crea una cuenta para solicitar tu cita.", false);
      return;
    }
    if (currentUser.role === "admin") {
      showToast("Inicia sesión con una cuenta de cliente para agendar una cita.");
      return;
    }
    const appointment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: currentUser.email,
      service: byId("appointmentService").value,
      date,
      time: byId("appointmentTime").value,
      therapist: assignTherapist(),
      notes: byId("appointmentNotes").value.trim(),
      createdAt: new Date().toISOString()
    };
    if (appointments.some((existing) => existing.date === date)) {
      dateField.setCustomValidity("Esta fecha ya está ocupada. Elige otro día.");
      dateField.reportValidity();
      showToast("Ese día ya está ocupado. Elige otra fecha disponible.");
      return;
    }
    const nextAppointments = [...appointments, appointment];
    if (!saveCollection(STORAGE_KEYS.appointments, nextAppointments)) return;
    appointments = nextAppointments;
    form.reset();
    byId("appointmentDate").min = getToday();
    renderAvailabilityCalendar();
    const confirmation = byId("bookingConfirmation");
    confirmation.textContent = `Tu cita quedó asignada a ${appointment.therapist}. El equipo Daixi confirmará tu horario.`;
    confirmation.classList.remove("hidden");
    showToast(`¡Listo! Tu cita fue asignada a ${appointment.therapist}. El equipo Daixi confirmará tu horario.`);
  });

  document.querySelectorAll(".book-offer").forEach((button) => {
    button.addEventListener("click", () => {
      byId("appointmentService").value = button.dataset.service;
      byId("citas").scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => byId("appointmentDate").focus({ preventScroll: true }), 450);
    });
  });

  byId("membershipButton").addEventListener("click", () => {
    byId("membershipMessage").textContent = "";
    if (currentUser && currentUser.role !== "admin") {
      byId("membershipEmail").value = currentUser.email;
      byId("membershipPhone").value = currentUser.phone || "";
    } else {
      byId("membershipForm").reset();
    }
    byId("membershipDialog").showModal();
  });
  byId("closeMembership").addEventListener("click", () => byId("membershipDialog").close());
  byId("membershipDialog").addEventListener("click", (event) => {
    if (event.target === byId("membershipDialog")) byId("membershipDialog").close();
  });
  byId("membershipForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireStorage() || !event.currentTarget.reportValidity()) return;
    const email = byId("membershipEmail").value.trim().toLowerCase();
    if (memberships.some((membership) => membership.email.toLowerCase() === email && membership.status === "solicitada")) {
      byId("membershipMessage").textContent = "Ya recibimos una solicitud con este correo. Daixi se pondrá en contacto pronto.";
      return;
    }
    const membership = {
      email,
      phone: byId("membershipPhone").value.trim(),
      status: "solicitada",
      createdAt: new Date().toISOString()
    };
    const nextMemberships = [...memberships, membership];
    if (!saveCollection(STORAGE_KEYS.memberships, nextMemberships)) return;
    memberships = nextMemberships;
    renderSession();
    event.currentTarget.reset();
    byId("membershipDialog").close();
    showToast("¡Recibimos tu solicitud! Daixi te contactará por correo o teléfono.");
  });
})();

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ⚠️ Reemplaza con las claves de TU proyecto "estor-tareas-publico"
const supabase = createClient(
    "https://ldcagcoagjblutzcfilh.supabase.co",
    "sb_publishable_dLOkRP6BxK5hKVkcuXPORg_C19lK3Od"
);

// Cierra sesión sin importar si el servidor responde bien o mal
// (si el usuario fue borrado, la petición de signOut al servidor falla,
// pero igual queremos borrar el token guardado en este navegador)
async function cerrarSesionForzado() {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.warn("signOut falló en el servidor (probablemente el usuario ya no existe):", e);
    }
    Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
        .forEach(k => localStorage.removeItem(k));
}

document.addEventListener("DOMContentLoaded", () => {

    // =========================================
    // 0. SI YA HAY SESIÓN ACTIVA, ENTRAR DE UNA
    // =========================================
    (async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
            window.location.href = "12381792387192.html";
        } else if (error) {
            // El token local existe pero el usuario ya no existe en Supabase (fue borrado)
            await cerrarSesionForzado();
        }
    })();

    // =========================================
    // 1. SLIDER (Carrusel de imágenes)
    // =========================================
    const track = document.getElementById('track');
    const dots = document.querySelectorAll('.dot');

    if (track && dots.length > 0) {
        const totalSlides = dots.length;
        let currentSlide = 0;

        function goToSlide(index) {
            if (index < 0) index = totalSlides - 1;
            if (index >= totalSlides) index = 0;
            const percentage = (index * (100 / totalSlides));
            track.style.transform = `translateX(-${percentage}%)`;
            currentSlide = index;
            dots.forEach(dot => dot.classList.remove('active'));
            dots[currentSlide].classList.add('active');
        }

        window.manualSlide = goToSlide;

        function nextSlide() { goToSlide(currentSlide + 1); }
        setInterval(nextSlide, 3000);
    }

    // =========================================
    // 2. TOGGLE LOGIN <-> REGISTRO
    // =========================================
    const vistaLogin = document.getElementById('vistaLogin');
    const vistaRegistro = document.getElementById('vistaRegistro');

    document.getElementById('toggleAuthBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        vistaLogin.style.display = 'none';
        vistaRegistro.style.display = 'block';
    });

    document.getElementById('toggleToLoginBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        vistaRegistro.style.display = 'none';
        vistaLogin.style.display = 'block';
    });

    // =========================================
    // 2b. MOSTRAR/OCULTAR CONTRASEÑA
    // =========================================
    function activarToggleOjo(idInput, idIcono) {
        const input = document.getElementById(idInput);
        const icono = document.getElementById(idIcono);
        if (!input || !icono) return;
        icono.addEventListener('click', () => {
            const esPassword = input.type === 'password';
            input.type = esPassword ? 'text' : 'password';
            icono.classList.toggle('fa-eye', esPassword);
            icono.classList.toggle('fa-eye-slash', !esPassword);
        });
    }
    activarToggleOjo('login-password', 'toggleLoginPass');
    activarToggleOjo('reg-password', 'toggleRegPass');

    // =========================================
    // 3. LOGIN
    // =========================================
    const formLogin = document.getElementById("formLogin");

    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnLoginSubmit');
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            btn.disabled = true;
            btn.textContent = "Entrando...";

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                mostrarAlerta(traducirErrorLogin(error.message));
                btn.disabled = false;
                btn.textContent = "Sign in";
                return;
            }

            window.location.href = "12381792387192.html";
        });
    }

    // =========================================
    // 3c. VERIFICAR CORREO CON GOOGLE (solo autocompleta, no hace login OAuth)
    // =========================================
    // ⚠️ Reemplaza con TU Client ID de Google (el mismo que usaste en Supabase, sin el Secret)
    const GOOGLE_CLIENT_ID = "696859807092-q04redvk6g2jctr85e2plg48agmgpjgv.apps.googleusercontent.com";

    function decodificarJWT(token) {
        const payload = token.split('.')[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    }

    function manejarCredencialGoogle(response) {
        const datos = decodificarJWT(response.credential);
        // datos.email ya viene verificado por Google (datos.email_verified === true)

        const inputEmail = document.getElementById('reg-email');
        const inputNombre = document.getElementById('reg-nombre');
        const txtVerificado = document.getElementById('googleVerificadoTxt');

        inputEmail.value = datos.email;
        inputEmail.readOnly = true; // ya no se puede editar, queda fijo al verificado
        inputEmail.style.opacity = '0.75';

        if (!inputNombre.value) {
            inputNombre.value = datos.name || '';
        }

        txtVerificado.style.display = 'block';
        document.getElementById('googleBtnContainer').style.display = 'none';

        mostrarAlerta("Correo verificado con Google. Ahora elige tu contraseña.");
        document.getElementById('reg-password').focus();
    }

    if (window.google) {
        inicializarGoogleBoton();
    } else {
        window.addEventListener('load', inicializarGoogleBoton);
    }

    function inicializarGoogleBoton() {
        if (!window.google || !document.getElementById('googleBtnContainer')) return;
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: manejarCredencialGoogle
        });
        google.accounts.id.renderButton(
            document.getElementById('googleBtnContainer'),
            { theme: "outline", size: "large", width: 320, text: "continue_with" }
        );
    }

    // =========================================
    // 4. REGISTRO
    // =========================================
    const formRegistro = document.getElementById("formRegistro");

    if (formRegistro) {
        formRegistro.addEventListener("submit", async (e) => {
            e.preventDefault();

            const terms = document.getElementById('terms');
            if (!terms.checked) {
                mostrarAlerta("Debes aceptar los terms of service");
                terms.closest('.checkbox-container').style.animation = 'shake 0.4s ease';
                setTimeout(() => { terms.closest('.checkbox-container').style.animation = ''; }, 400);
                return;
            }

            const btn = document.getElementById('btnRegistroSubmit');
            const nombre = document.getElementById('reg-nombre').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;

            btn.disabled = true;
            btn.textContent = "Creando cuenta...";

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { nombre } // se usa en el trigger para crear el perfil
                }
            });

            if (error) {
                mostrarAlerta(traducirErrorRegistro(error.message));
                btn.disabled = false;
                btn.textContent = "Crear cuenta";
                return;
            }

            // Si "Confirm email" está DESACTIVADO en Supabase, ya hay sesión y podemos entrar directo
            if (data.session) {
                window.location.href = "12381792387192.html";
            } else {
                mostrarAlerta("¡Cuenta creada! Revisa tu correo (" + email + ") y haz click en el link de confirmación antes de iniciar sesión.");
                btn.disabled = false;
                btn.textContent = "Crear cuenta";
                formRegistro.reset();
                document.getElementById('reg-email').readOnly = false;
                document.getElementById('reg-email').style.opacity = '1';
                document.getElementById('googleVerificadoTxt').style.display = 'none';
                document.getElementById('googleBtnContainer').style.display = 'block';
            }
        });
    }

    // =========================================
    // 5. MODAL TÉRMINOS
    // =========================================
    const modal = document.getElementById('termsModal');
    const btnOpen = document.getElementById('termsLink');
    const btnClose = document.querySelector('.close-btn');
    const btnAccept = document.getElementById('acceptBtn');

    const closeModal = () => modal.classList.remove('active');

    if (btnOpen) {
        btnOpen.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('active');
        });
    }
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnAccept) {
        btnAccept.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
        });
    }
    window.addEventListener('click', (e) => {
        if (e.target == modal) closeModal();
    });

});

// =========================================
// TRADUCCIÓN DE ERRORES DE SUPABASE
// =========================================
function traducirErrorLogin(msg) {
    if (msg.includes("Invalid login credentials")) return "Correo o contraseña incorrectos";
    if (msg.includes("Email not confirmed")) return "Debes confirmar tu correo antes de entrar";
    return "Error al iniciar sesión: " + msg;
}

function traducirErrorRegistro(msg) {
    if (msg.includes("already registered") || msg.includes("already been registered")) return "Ese correo ya tiene una cuenta";
    if (msg.includes("Password should be")) return "La contraseña debe tener al menos 6 caracteres";
    return "Error al crear la cuenta: " + msg;
}

// =========================================
// FUNCIÓN GLOBAL DE ALERTA
// =========================================
function mostrarAlerta(msg) {
    let alert = document.querySelector(".custom-alert");
    if (!alert) {
        alert = document.createElement("div");
        alert.className = "custom-alert";
        document.body.appendChild(alert);
    }
    alert.textContent = msg;
    alert.classList.add("show");
    setTimeout(() => alert.classList.remove("show"), 4000);
}
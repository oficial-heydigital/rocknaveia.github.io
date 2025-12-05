// This file contains the main functionality for the website, including any interactive elements.

// Function to initialize the website
function init() {
    // Add event listeners or any initialization code here
    console.log("Rock na Véia website initialized.");
}

// Call the init function when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Load header and footer components if placeholders exist
    function loadComponent(path){
        return fetch(path).then(res => {
            if(!res.ok) throw new Error('Failed to load ' + path);
            return res.text();
        });
    }

    // Inject components into elements with data-include attribute
    (function injectComponents(){
        const includeEls = document.querySelectorAll('[data-include]');
        if(!includeEls.length) return;
        includeEls.forEach(el => {
            const name = el.getAttribute('data-include');
            if(!name) return;
            const path = `components/${name}.html`;
            loadComponent(path)
                .then(html => {
                    el.innerHTML = html;
                    setupUI();
                })
                .catch(err => {
                    console.warn('Could not load component', path, err);
                    // Insert a small fallback so header/footer still appear when fetch fails (file://)
                    insertFallback(name, el);
                    setupUI();
                });
        });
    })();

    // If components cannot be fetched (for example when opened via file://),
    // we insert a minimal header/footer so the pages still display navigation.
    function insertFallback(name, el){
        if(name === 'header'){
            el.innerHTML = `
                <nav id="mainNavbar" class="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm">
                    <div class="container">
                        <a class="navbar-brand d-flex align-items-center text-dark" href="index.html">
                            <i class="bi bi-music-note-beamed fs-3 me-2 text-primary"></i>
                            <span class="fw-bold">Rock na Véia</span>
                        </a>
                        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navCollapse" aria-controls="navCollapse" aria-expanded="false" aria-label="Alternar navegação">
                            <span class="navbar-toggler-icon"></span>
                        </button>
                        <div class="collapse navbar-collapse" id="navCollapse">
                            <ul class="navbar-nav ms-auto align-items-lg-center">
                                <li class="nav-item"><a class="nav-link text-dark" href="index.html">Início</a></li>
                                <li class="nav-item"><a class="nav-link text-dark" href="about.html">Sobre</a></li>
                                <li class="nav-item"><a class="nav-link text-dark" href="gallery.html">Galeria</a></li>
                                <li class="nav-item"><a class="nav-link text-dark" href="events.html">Eventos</a></li>
                                <li class="nav-item"><a class="nav-link btn btn-outline-primary ms-lg-3" href="contact.html">Contato</a></li>
                            </ul>
                        </div>
                    </div>
                </nav>
            `;
        } else if(name === 'footer'){
            el.innerHTML = `
                <footer class="bg-light text-dark pt-5 pb-4 mt-5 border-top">
                    <div class="container">
                        <div class="row align-items-center">
                            <div class="col-md-6 text-center text-md-start mb-3 mb-md-0">
                                <strong>Rock na Véia</strong>
                                <p class="mb-0 small text-muted">Música autoral e covers com atitude.</p>
                            </div>
                            <div class="col-md-6 text-center text-md-end">
                                <a href="#" class="text-decoration-none text-muted me-3"><i class="bi bi-instagram fs-5"></i></a>
                                <a href="#" class="text-decoration-none text-muted me-3"><i class="bi bi-facebook fs-5"></i></a>
                                <a href="#" class="text-decoration-none text-muted"><i class="bi bi-youtube fs-5"></i></a>
                            </div>
                        </div>
                        <hr class="my-3">
                        <div class="d-flex justify-content-between small text-muted">
                            <div>&copy; <span id="year"></span> Rock na Véia. Todos os direitos reservados.</div>
                            <div>Feito com <i class="bi bi-heart-fill text-danger"></i></div>
                        </div>
                    </div>
                </footer>
            `;
        }
    }

    // Initialize UI bits that rely on injected components (year, navbar behavior)
    function setupUI(){
        // Footer year
        const yearEl = document.getElementById('year');
        if(yearEl) yearEl.textContent = new Date().getFullYear();

        // Navbar shrink on scroll
        const navbar = document.getElementById('mainNavbar');
        const shrinkOn = 70;
        if(navbar && !navbar.__navSetup){
            function onScroll(){
                if(!navbar) return;
                if(window.scrollY > shrinkOn) navbar.classList.add('navbar-shrink');
                else navbar.classList.remove('navbar-shrink');
            }
            onScroll();
            window.addEventListener('scroll', onScroll, {passive:true});
            navbar.__navSetup = true;
        }
    }

    // Footer year
    const yearEl = document.getElementById('year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    // Navbar shrink on scroll
    const navbar = document.getElementById('mainNavbar');
    const shrinkOn = 70;
    function onScroll(){
        if(!navbar) return;
        if(window.scrollY > shrinkOn) navbar.classList.add('navbar-shrink');
        else navbar.classList.remove('navbar-shrink');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
});
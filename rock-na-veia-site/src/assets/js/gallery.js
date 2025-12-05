// This file manages the functionality specific to the gallery page, such as image sliders or lightbox effects.

document.addEventListener('DOMContentLoaded', function() {
    const galleryImages = document.querySelectorAll('.gallery-image');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const closeLightbox = document.getElementById('close-lightbox');

    galleryImages.forEach(image => {
        image.addEventListener('click', function() {
            lightbox.style.display = 'flex';
            lightboxImage.src = this.src;
        });
    });

    closeLightbox.addEventListener('click', function() {
        lightbox.style.display = 'none';
    });

    // Optional: Close lightbox when clicking outside the image
    lightbox.addEventListener('click', function(event) {
        if (event.target === lightbox) {
            lightbox.style.display = 'none';
        }
    });
});
//Con querySelector seleccionamos las imagenes del carrusel y los botones
document.addEventListener('DOMContentLoaded', function() {

const carousel = document.querySelector('.carousel-atracciones');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
let currentIndex = 0;//Indice inicial del carrusel


function showSlide(index) {
  const slides = document.querySelectorAll('.atraccion-slide');
  
  // Validar límites
  if (index >= slides.length) {
    currentIndex = 0;
  } else if (index < 0) {
    currentIndex = slides.length - 1;
  } else {
    currentIndex = index;
  }
  
  // Aplicar transformación
  const offset = currentIndex * 100;
  carousel.style.transform = `translateX(-${offset}%)`;
  
  console.log(`Mostrando slide ${currentIndex} de ${slides.length}`);
}

prevBtn.addEventListener('click', () => {
  showSlide(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  showSlide(currentIndex + 1);
});

// Inicializar
showSlide(0);
});
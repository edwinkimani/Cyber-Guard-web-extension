document.addEventListener("DOMContentLoaded", function () {
  const featureCards = document.querySelectorAll(".feature-card");

  featureCards.forEach((card, index) => {
    // Remove the initial animation classes
    card.classList.remove("animate__animated", "animate__fadeInLeft");

    // Add intersection observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            card.classList.add("animate__animated", "animate__fadeInLeft");
            card.style.animationDelay = `${index * 0.1}s`;
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(card);
  });
});

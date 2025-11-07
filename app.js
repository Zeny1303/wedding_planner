// app.js — minimal interactivity for the homepage
const $ = (s, c=document)=>c.querySelector(s);
const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));

/* Sticky header shadow on scroll */
const header = $('#header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
document.addEventListener('scroll', onScroll); onScroll();

/* Mobile nav toggle */
const navToggle = $('#navToggle');
const nav = $('#nav');
if (navToggle){
  navToggle.addEventListener('click', ()=>{
    nav.classList.toggle('open');
  });
}

/* Fake “Get Started” search handler (replace as needed) */
$('#getStarted').addEventListener('click', ()=>{
  const type = $('#vendorType').value;
  const city = $('#city').value;
  const q = encodeURIComponent(`${type} in ${city}`);
  // Navigate to your vendors page or filter section
  alert(`Searching: ${type} · ${city}`);
  // window.location.href = `/vendors.html?type=${encodeURIComponent(type)}&city=${encodeURIComponent(city)}`;
});

/* Smooth anchor scroll */
$$('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const id = a.getAttribute('href');
    if(id.length>1){
      e.preventDefault();
      document.querySelector(id)?.scrollIntoView({behavior:'smooth', block:'start'});
      nav.classList.remove('open');
    }
  });
});



import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.scss'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

widget_scss = '''
/* =========================================
   WIDGET DE CONSEJOS PASIVOS (DRACO)
   ========================================= */
.draco-consejo-widget {
  position: fixed;
  top: calc(var(--hud-height, 60px) + 20px);
  left: 20px;
  z-index: 9999;
  pointer-events: none; /* No bloquea clicks en el mapa */
  display: flex;
  align-items: flex-start;
  gap: 15px;
  
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.5s ease, transform 0.5s ease;
  visibility: hidden;
  
  &.mostrar {
    opacity: 1;
    transform: translateY(0);
    visibility: visible;
  }

  .avatar-caja {
    flex-shrink: 0;
  }

  .draco-avatar {
    width: 90px; /* Escalado más pequeño que el nivel (150px) */
    height: auto;
    filter: drop-shadow(0 0 8px rgba(0,0,0,0.8));
    border-radius: 50%; /* Por si usa background circular, aunque la imagen ya lo trae */
  }

  .globo-texto {
    background-color: #fff;
    color: #000;
    padding: 12px 18px;
    border-radius: 12px;
    border: 3px solid #333;
    font-family: 'Share Tech Mono', monospace, sans-serif;
    font-size: 0.95rem;
    position: relative;
    box-shadow: 4px 4px 0px rgba(0,0,0,0.5);
    max-width: 350px;
    
    p {
      margin: 0;
      line-height: 1.4;
    }

    &::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 25px;
      border-width: 8px 16px 8px 0;
      border-style: solid;
      border-color: transparent #333 transparent transparent;
    }

    &::after {
      content: '';
      position: absolute;
      left: -11px;
      top: 28px;
      border-width: 5px 11px 5px 0;
      border-style: solid;
      border-color: transparent #fff transparent transparent;
    }
  }

  @media (max-width: 768px) {
    top: calc(var(--hud-height, 60px) + 35px);
    left: 10px;
    gap: 10px;

    .draco-avatar {
      width: 60px;
    }

    .globo-texto {
      font-size: 0.8rem;
      padding: 10px 14px;
      max-width: 200px;

      &::before {
        top: 15px;
      }
      &::after {
        top: 18px;
      }
    }
  }
}
'''

if 'draco-consejo-widget' not in content:
    content += '\n' + widget_scss
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SCSS updated")
else:
    print("SCSS already contains widget styles")

import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/nivel-ogro/nivel-ogro.component.scss'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

vidas_css = '''
.editor-vidas-box {
  background: rgba(255, 105, 135, 0.1);
  border: 1px solid #ff6987;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1.5rem;
  margin-bottom: 1rem;

  h4 {
    margin: 0 0 0.5rem 0;
    color: #ff6987;
    font-size: 0.9rem;
    font-weight: 700;
  }

  p {
    margin: 0 0 1rem 0;
    font-size: 0.78rem;
    color: #e5bd63;
  }

  select {
    border-color: #ff6987;
    color: #ff6987;
    background-image: url('data:image/svg+xml;utf8,<svg fill="%23ff6987" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>');
    
    &:focus-visible {
      border-color: #ff6987;
      box-shadow: 0 0 0 2px rgba(255,105,135,0.2);
    }
  }

  .editor-field span {
    color: #ff6987;
  }
}
'''
text = text + '\n' + vidas_css

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print('CSS added')

import re

with open('src/app/nivel-dos-prototipo/nivel-dos-prototipo.component.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { LoaderService } from '../services/loader.service';", "import { LoaderService } from '../services/loader.service';\nimport { ViewChild } from '@angular/core';\nimport { LayoutJuegoComponent, TarjetaConfig } from '../layout-juego/layout-juego.component';\nimport nivel2Data from '../../../assets/data/aventuraniveles/nivel-2.json';")
content = content.replace("imports: [CommonModule, FormsModule, GameHeaderComponent],", "imports: [CommonModule, FormsModule, LayoutJuegoComponent],")

content = re.sub(r'readonly fasesBase: FaseNivelDos\[\] = \[.*?\];', '', content, flags=re.DOTALL)
content = re.sub(r'readonly protocolosAprendidos: ProtocoloAprendido\[\] = \[.*?\];', 'readonly protocolosAprendidos = nivel2Data.protocolosAprendidos as ProtocoloAprendido[];', content, flags=re.DOTALL)
content = content.replace('fases: FaseNivelDos[] = [...this.fasesBase];', 'fases: FaseNivelDos[] = nivel2Data.fases as unknown as FaseNivelDos[];')

props = '''
  @ViewChild(LayoutJuegoComponent) layoutJuego!: LayoutJuegoComponent;
  pasoAndamiaje = 0;
  antiCopiaActivo = false;
  ayudaUsada = false;
  
  private readonly tonoColores: Record<string, { boton: string; consola: string }> = {
    azul:    { boton: '#174bd4', consola: '#82B1FF' },
    verde:   { boton: '#288650', consola: '#A5D6A7' },
    dorado:  { boton: '#df4517', consola: '#FFAB91' },
    violeta: { boton: '#8e1ba4', consola: '#CE93D8' }
  };

  inventarioNivel = {
    libro: { activo: true },
    clarividencia: { activo: false, consumida: false },
    vida: { activo: true, consumida: false },
    tiempo: { activo: false, consumida: false }
  };

  get ejecutandoComandos(): boolean { return this.ejecutando; }
  
  falloFase1AndamiajeConfig = { operador: '', valor: 0, accion: '', tipoFallo: '' };

  get configTarjetasTaladro(): TarjetaConfig[] {
    if (this.faseActual.numero === 1) {
      let andamiaje: any[] = [];
      switch (this.pasoAndamiaje) {
        case 0:
          andamiaje = [{ etiqueta: "Control temperatura", codigo: "si(taladro.temperatura ▯ ▯) {\\n    ▯\\n  }", tono: "dorado" }];
          break;
        case 1:
          andamiaje = [{ etiqueta: ">", codigo: ">", tono: "violeta" }, { etiqueta: "<", codigo: "<", tono: "violeta" }];
          break;
        case 2:
          andamiaje = [0, 50, 75, 100, 150].map(v => ({ etiqueta: v.toString(), codigo: v.toString(), tono: "azul" }));
          break;
        case 3:
          andamiaje = [
            { etiqueta: "Liberar vapor", codigo: "taladro.liberarVapor();", tono: "verde" },
            { etiqueta: "Apagar motor", codigo: "taladro.apagarMotor();", tono: "verde" },
            { etiqueta: "Extraer carbón", codigo: "taladro.extraerCarbon();", tono: "verde" }
          ];
          break;
      }
      return andamiaje.map(t => {
        const colores = this.tonoColores[t.tono] || this.tonoColores['azul'];
        return { nombre: t.etiqueta, accion: t.codigo, colorBoton: colores.boton, colorConsola: colores.consola };
      });
    }
    return this.faseActual.tarjetas.map(t => {
      const colores = this.tonoColores[(t as any).tono] || this.tonoColores['azul'];
      return { nombre: (t as any).etiqueta, accion: (t as any).codigo, colorBoton: colores.boton, colorConsola: colores.consola };
    });
  }
'''
content = content.replace('faseActualIndice = 0;', props + '\\n  faseActualIndice = 0;')
content = content.replace("vidas = 3;", "")

interactions = '''
  manejarToggleDraco(estado: boolean) { this.ayudaVisible = estado; }
  manejarUsoPocion(pocion: string) { if (pocion === 'libro') this.ayudaVisible = !this.ayudaVisible; }
  registrarAyudaUsada() { this.ayudaUsada = true; }

  manejarUsoTarjeta(tarjeta: TarjetaConfig): void {
    if (this.faseActual.numero !== 1) { this.ayudaUsada = true; return; }
    if (this.pasoAndamiaje === 0) {
      const lineas = this.layoutJuego.lineasCodigo;
      const idx = lineas.findIndex(l => l.esPlaceholder);
      if (idx !== -1) {
        const nuevasLineas = tarjeta.accion.split('\\n').map(l => ({ texto: '    ' + l, color: '#DCDCAA', tieneError: false }));
        lineas.splice(idx, 1, ...nuevasLineas);
      }
      this.pasoAndamiaje++;
    } else if (this.pasoAndamiaje >= 1 && this.pasoAndamiaje <= 3) {
      const lineas = this.layoutJuego.lineasCodigo;
      for (let i = 0; i < lineas.length; i++) {
        if (lineas[i].texto.includes('▯')) {
           lineas[i].texto = lineas[i].texto.replace('▯', tarjeta.accion);
           if (this.pasoAndamiaje === 3 && tarjeta.accion.includes('taladro.')) lineas[i].color = '#569CD6';
           break;
        }
      }
      this.pasoAndamiaje++;
    }
  }

  ngAfterViewInit(): void { setTimeout(() => this.inicializarConsolaTexto(), 0); }

  private inicializarConsolaTexto(): void {
    if (this.layoutJuego) {
      this.layoutJuego.lineasCodigo = [
        { texto: this.faseActual.evento, color: '#C586C0', tieneError: false, fija: true },
        { texto: '    // Inserta tu código aquí', color: '#6b7280', tieneError: false, esPlaceholder: true },
        { texto: '}', color: '#C586C0', tieneError: false, fija: true }
      ];
      if (this.layoutJuego.consola) {
        this.layoutJuego.consola.lineas = this.layoutJuego.lineasCodigo;
        this.layoutJuego.consola.lineaActivaIndex = 1;
      }
    }
    if (this.faseActual.numero === 1) this.pasoAndamiaje = 0;
  }

  restaurarPlantilla(): void {
    if (this.ejecutando || this.faseCompletada || this.falloFase) return;
    this.inicializarConsolaTexto();
    this.errores = [];
  }

  borrarUltimaLineaPlantilla(): void {
    if (this.ejecutando || this.faseCompletada || this.falloFase || !this.layoutJuego) return;
    if (this.faseActual.numero === 1) { this.inicializarConsolaTexto(); return; }

    const lineas = this.layoutJuego.lineasCodigo;
    const idxLibre = lineas.map((l, i) => ({l, i})).reverse().find(x => !x.l.fija && !x.l.esPlaceholder)?.i;
    if (idxLibre !== undefined) {
      lineas.splice(idxLibre, 1);
      if (!lineas.some(l => !l.fija && !l.esPlaceholder)) {
         const indexCierre = lineas.findIndex(l => l.texto.trim() === '}' && l.fija);
         lineas.splice(indexCierre !== -1 ? indexCierre : lineas.length, 0, { texto: '    // Inserta tu código aquí', color: '#6b7280', tieneError: false, esPlaceholder: true });
      }
    }
    this.errores = [];
  }
'''
content = content.replace('ngOnInit(): void {', interactions + '\\n  ngOnInit(): void {')

content = re.sub(r'  insertarTarjeta.*?ejecutarCodigo\(\): void \{', '  ejecutarNivel(codigoDesdeConsola: string): void {', content, flags=re.DOTALL)

content = content.replace("const resultado = this.motor.evaluarTaladro(this.codigoCompleto, this.faseActual.numero);", '''
    this.falloFase1AndamiajeConfig = { operador: '', valor: 0, accion: '', tipoFallo: '' };
    if (this.faseActual.numero === 1) {
      const res = this.motor.evaluarAndamiajeFase1(codigoDesdeConsola);
      if (res.valido) { this.estrategias.estrategiaVaporCorrecta = true; } 
      else { this.estrategias.estrategiaVaporCorrecta = false; this.falloFase1AndamiajeConfig = res; }
    } else {
      const resultado = this.motor.evaluarTaladro(codigoDesdeConsola, this.faseActual.numero);
''')
content = content.replace("this.estrategias = resultado.banderas;\\n    this.erroresPendientes = resultado.errores.map(error => error.mensaje);", "this.estrategias = resultado.banderas;\\n      this.erroresPendientes = resultado.errores.map(error => error.mensaje);\\n    }")

content = content.replace('''    if (fase === 1 && this.temperatura > 100) {
      this.resolverEvento('temperatura');
      return;
    }''', '''    if (fase === 1) {
      if (this.estrategias.estrategiaVaporCorrecta) { if (this.temperatura > 100) this.resolverEvento('temperatura'); return; }
      const conf = this.falloFase1AndamiajeConfig;
      let cond = false;
      if (conf.operador === '>') cond = this.temperatura > conf.valor;
      if (conf.operador === '<') cond = this.temperatura < conf.valor;
      if (cond && conf.tipoFallo) { this.fallarFase1Andamiaje(conf.tipoFallo); return; }
      if (this.temperatura > 100) this.fallarFase1Andamiaje('SOBRECALENTAMIENTO');
      return;
    }''')

content = content.replace("  private fallarFase(tipo: TipoEventoTaladro): void {", '''  fallarFase1Andamiaje(tipoFallo: string): void {
    this.detenerGameLoop();
    this.ejecutando = false;
    this.falloFase = true;
    this.erroresAcumulados++;
    this.errores = ['Configuración incorrecta del andamiaje.'];
    if (tipoFallo === 'AHOGO') { this.estadoTaladro = 'ahogo' as any; this.bitacora = 'El motor se ahogó por liberar vapor antes de tiempo.'; }
    else if (tipoFallo === 'SOBRECALENTAMIENTO') { this.estadoTaladro = 'explosion'; this.bitacora = 'El taladro se sobrecalentó.'; }
    else if (tipoFallo === 'DESCOMPUESTO') { this.estadoTaladro = 'descompuesto' as any; this.bitacora = 'Apagar el motor de golpe dañó los engranajes.'; }
    else { this.estadoTaladro = 'explosion'; this.bitacora = 'El taladro explotó por configuración incorrecta.'; }
  }

  private fallarFase(tipo: TipoEventoTaladro): void {''')

content = content.replace('this.vidas = 3;', '')
content = content.replace('this.vidas--;', '')
content = content.replace('if (this.vidas <= 0) {', 'if (false) {')
content = re.sub(r'if \(!this\.esActividadAula\) \{\s*this\.fases = this\.fasesBase.*?;?\s*\}', '', content, flags=re.DOTALL)

with open('src/app/nivel-dos-prototipo/nivel-dos-prototipo.component.ts', 'w', encoding='utf-8') as f:
    f.write(content)

import smtplib
import os
from email.message import EmailMessage

def enviar_correo_recuperacion(email_destino: str, token: str):
    """
    Envía un correo de alta calidad con el enlace de recuperación de contraseña.
    """
    print(f"--- INICIANDO RECUPERACIÓN PARA: {email_destino} ---")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    print(f"SMTP USER LOADED: {smtp_user}")
    
    if not smtp_user or not smtp_password:
        print("ERROR FATAL: Las credenciales SMTP no se cargaron en el entorno de FastAPI.")
        return

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:4200")
    enlace_recuperacion = f"{frontend_url}/reset-password?token={token}"

    mensaje = EmailMessage()
    mensaje["Subject"] = "Recuperación de Acceso | DragonCode"
    mensaje["From"] = f"Soporte DragonCode <{smtp_user}>"
    mensaje["To"] = email_destino

    cuerpo_html = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #1a1b26;
                color: #c0caf5;
                padding: 40px 20px;
                text-align: center;
            }}
            .contenedor {{
                background-color: #24283b;
                border: 1px solid #414868;
                border-top: 4px solid #7aa2f7;
                border-radius: 8px;
                padding: 40px;
                max-width: 500px;
                margin: 0 auto;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }}
            h1 {{ color: #7aa2f7; font-size: 24px; letter-spacing: 1px; margin-bottom: 30px; }}
            p {{ font-size: 15px; line-height: 1.6; color: #a9b1d6; text-align: left; }}
            .boton {{
                display: inline-block;
                background-color: #7aa2f7;
                color: #1a1b26;
                padding: 14px 30px;
                text-decoration: none;
                font-weight: bold;
                border-radius: 6px;
                margin: 30px 0;
                font-size: 14px;
                letter-spacing: 1px;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #414868;
                font-size: 12px;
                color: #565f89;
                text-align: left;
            }}
        </style>
    </head>
    <body>
        <div class="contenedor">
            <h1>DRAGONCODE</h1>
            <p>Estimado Jugador / Anfitrión,</p>
            <p>Hemos recibido una solicitud oficial para restablecer el acceso a tu cuenta en la plataforma. Si iniciaste este proceso, haz clic en el botón inferior para forjar una nueva credencial de seguridad.</p>
            <a href="{enlace_recuperacion}" class="boton">RESTABLECER CONTRASEÑA</a>
            <p><em>Por motivos estrictos de seguridad, este enlace expirará automáticamente en 15 minutos. Si no has solicitado este cambio, ignora este mensaje; tu cuenta permanece protegida.</em></p>
            <div class="footer">
                Atentamente,<br>El equipo de seguridad de DragonCode
            </div>
        </div>
    </body>
    </html>
    """

    mensaje.add_alternative(cuerpo_html, subtype='html')

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as servidor:
            servidor.login(smtp_user, smtp_password)
            servidor.send_message(mensaje)
    except Exception as e:
        print(f"Error SMTP Recuperación: {e}")


def enviar_reporte_actividad(
    email_destino: str,
    nombre_aula: str,
    titulo_actividad: str,
    fecha_cierre: str,
    completados: int,
    total_jugadores: int,
    pendientes: int,
    promedio: float,
    lista_alumnos: list
):
    """
    Envía un correo de alta calidad con el reporte final, incluyendo calificaciones por jugador.
    """
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        return

    mensaje = EmailMessage()
    mensaje["Subject"] = f"Reporte de Actividad: {titulo_actividad} | {nombre_aula}"
    mensaje["From"] = f"Reportes DragonCode <{smtp_user}>"
    mensaje["To"] = email_destino

    porcentaje = round((completados / total_jugadores * 100) if total_jugadores > 0 else 0)

    filas_html = ""
    for jugador in lista_alumnos:
        color_calificacion = "#f7768e" if jugador['calificacion'] == "Sin entrega" else "#9ece6a"
        filas_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #414868; text-align: left; color: #c0caf5;">{jugador['nombre_completo']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #414868; text-align: center; color: {color_calificacion}; font-weight: bold;">{jugador['calificacion']}</td>
        </tr>
        """

    cuerpo_html = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #1a1b26;
                color: #c0caf5;
                padding: 40px 20px;
                text-align: center;
            }}
            .contenedor {{
                background-color: #24283b;
                border: 1px solid #414868;
                border-top: 4px solid #bb9af7;
                border-radius: 8px;
                padding: 40px;
                max-width: 600px;
                margin: 0 auto;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }}
            h1 {{ color: #bb9af7; font-size: 22px; margin-bottom: 5px; }}
            h2 {{ color: #7aa2f7; font-size: 16px; margin-top: 0; margin-bottom: 25px; font-weight: normal; }}
            p.intro {{ font-size: 15px; line-height: 1.6; color: #a9b1d6; text-align: left; margin-bottom: 30px; }}
            
            .stats-grid {{
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 35px;
            }}
            .stat-box {{
                background-color: #16161e;
                border: 1px solid #414868;
                border-radius: 6px;
                padding: 15px 10px;
                text-align: center;
            }}
            .stat-number {{ font-size: 24px; font-weight: bold; color: #bb9af7; }}
            .stat-label {{ font-size: 11px; color: #565f89; text-transform: uppercase; margin-top: 5px; letter-spacing: 1px; }}
            
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                background-color: #16161e;
                border-radius: 6px;
                overflow: hidden;
            }}
            th {{
                background-color: #414868;
                color: #ffffff;
                padding: 12px 10px;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #414868;
                font-size: 13px;
                color: #9aa5ce;
                text-align: left;
                line-height: 1.6;
            }}
        </style>
    </head>
    <body>
        <div class="contenedor">
            <h1>Reporte de Actividad</h1>
            <h2>Aula: {nombre_aula}</h2>
            
            <p class="intro">
                Estimado Anfitrión,<br><br>
                Aquí tienes el reporte detallado de la actividad <strong>"{titulo_actividad}"</strong>, correspondiente a la fecha de cierre del <strong>{fecha_cierre}</strong>.
            </p>
            
            <table style="margin-bottom: 30px;">
                <tr>
                    <td class="stat-box">
                        <div class="stat-number">{completados}/{total_jugadores}</div>
                        <div class="stat-label">Entregas</div>
                    </td>
                    <td class="stat-box">
                        <div class="stat-number">{pendientes}</div>
                        <div class="stat-label">Pendientes</div>
                    </td>
                    <td class="stat-box">
                        <div class="stat-number">{promedio}/10</div>
                        <div class="stat-label">Promedio</div>
                    </td>
                    <td class="stat-box">
                        <div class="stat-number">{porcentaje}%</div>
                        <div class="stat-label">Éxito</div>
                    </td>
                </tr>
            </table>

            <table>
                <thead>
                    <tr>
                        <th style="text-align: left;">Jugador (Apellidos, Nombres)</th>
                        <th style="text-align: center;">Calificación</th>
                    </tr>
                </thead>
                <tbody>
                    {filas_html}
                </tbody>
            </table>

            <div class="footer">
                Gracias por usar DragonCode y ayudarnos a potenciar la aventura de los jugadores.<br>
                <strong>Atentamente,<br>El equipo de DragonCode</strong>
            </div>
        </div>
    </body>
    </html>
    """

    mensaje.add_alternative(cuerpo_html, subtype='html')

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as servidor:
            servidor.login(smtp_user, smtp_password)
            servidor.send_message(mensaje)
    except Exception:
        pass

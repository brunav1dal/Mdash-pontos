import streamlit as st
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import altair as alt

# =================================================================
# BLOCO 1: CONFIGURAÇÃO E CONEXÃO
# =================================================================
st.set_page_config(page_title="Gestão de Obras - Dashboard", layout="wide")


scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]

def init_connection():
    try:
        if "gcp_service_account" in st.secrets:
            creds_dict = dict(st.secrets["gcp_service_account"])
            creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        else:
            creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", scope)
        return gspread.authorize(creds)
    except Exception as e:
        st.error(f"Erro de conexão: {e}")
        return None

client = init_connection()

# =================================================================
# BLOCO 2: CARREGAMENTO DE DADOS
# =================================================================
@st.cache_data(ttl=60)
def load_data():
    if client is None: return pd.DataFrame(), []
    try:
        spreadsheet = client.open("Controle de Presença (1º semestre/2026)")
        sheet = spreadsheet.worksheet("DATA_DASHBOARD")
        raw_data = sheet.get_all_values()
        
        df = pd.DataFrame(raw_data[1:], columns=raw_data[0])
        df.columns = df.columns.str.strip()
        
        clean_df = pd.DataFrame()
        clean_df['Colaborador']  = df.iloc[:, 0]
        clean_df['Obra']         = df.iloc[:, 1]
        clean_df['Status']       = df.iloc[:, 2]
        clean_df['Invest_Bruto'] = df.iloc[:, 3]
        clean_df['Econ_Bruto']   = df.iloc[:, 4]
        clean_df['Funcao']       = df.iloc[:, 5]
        clean_df['Turno']        = df.iloc[:, 6]

        for col, source in [('Investimento', 'Invest_Bruto'), ('Economia', 'Econ_Bruto')]:
            clean_df[col] = (clean_df[source].astype(str)
                             .str.replace(r'[R\$\.\s]', '', regex=True)
                             .str.replace(',', '.', regex=False)
                             .replace(['', 'nan'], '0'))
            clean_df[col] = pd.to_numeric(clean_df[col], errors='coerce').fillna(0)
        
        mask_erro = clean_df['Funcao'].str.upper().str.contains('NÃO CADASTRADO', na=False)
        pendentes = sorted(clean_df[mask_erro]['Colaborador'].unique().tolist())
        
        return clean_df, pendentes
    except Exception as e:
        st.error(f"Erro ao ler planilha: {e}")
        return pd.DataFrame(), []

df_total, pendentes = load_data()


# VERIFICAÇÃO CRÍTICA: Se o DF estiver vazio, pare aqui com uma mensagem clara.
if df_total.empty:
    st.error("⚠️ Erro de Dados: Não foi possível ler as informações da planilha.")
    st.info("Verifique se o e-mail da nova API foi adicionado como 'Editor' na nova planilha.")
    st.stop() # Isso impede o erro 'KeyError: Turno'

# Só executa o restante se houver dados

# =================================================================
# BLOCO 3: NAVEGAÇÃO E FILTROS (SIDEBAR)
# =================================================================
with st.sidebar:
    st.title("🧭 Navegação")
    tipo_painel = st.radio("Selecione o Painel:", ["💰 Financeiro", "📊 Assiduidade (Ponto)"])
    
    st.divider()
    st.title("⚙️ Filtros")
    
    if st.button('🔄 ATUALIZAR DADOS'):
        st.cache_data.clear()
        st.rerun()

    st.subheader("🌙 Turnos")
    turnos_list = sorted(df_total['Turno'].unique().tolist())
    sel_turnos = [t for t in turnos_list if st.checkbox(t, value=True, key=f"t_{t}")]

    st.subheader("📍 Obras")
    obras_list = sorted(df_total['Obra'].unique().tolist())
    sel_obras = [o for o in obras_list if st.checkbox(o, value=True, key=f"o_{o}")]

    st.subheader("👤 Colaborador")
    df_cad = df_total[~df_total['Funcao'].str.upper().str.contains('NÃO CADASTRADO', na=False)]
    colabs_list = sorted(df_cad['Colaborador'].unique().tolist())
    sel_colab = st.selectbox("Filtrar nome específico:", ["Todos"] + colabs_list)

    df_filtrado = df_total[(df_total['Turno'].isin(sel_turnos)) & (df_total['Obra'].isin(sel_obras))]
    if sel_colab != "Todos":
        df_filtrado = df_filtrado[df_filtrado['Colaborador'] == sel_colab]

# =================================================================
# BLOCO 4: LÓGICA DE EXIBIÇÃO
# =================================================================
if df_total.empty:
    st.error("⚠️ Não foi possível carregar os dados. Verifique sua conexão com a internet ou as credenciais do Google.")
    st.stop() # Para a execução aqui para evitar o erro de 'KeyError'

if pendentes:
    st.error(f"🚨 **PENDÊNCIA:** Regularizar cadastro de: {', '.join(pendentes)}")

if not sel_turnos or not sel_obras:
    st.warning("Selecione os filtros laterais.")
else:
    if tipo_painel == "💰 Financeiro":
        st.title("💰 Painel Financeiro")
        mask_p = df_filtrado['Status'].str.contains('Presente', case=False, na=False)
        inv = df_filtrado[mask_p]['Investimento'].sum()
        eco = df_filtrado['Economia'].sum()

        m1, m2, m3 = st.columns(3)
        m1.metric("Investimento", f"R$ {inv:,.2f}")
        m2.metric("Economia", f"R$ {eco:,.2f}")
        m3.metric("Total", f"R$ {(inv+eco):,.2f}")

        st.divider()
        
        c1, c2 = st.columns([6, 4])
        with c1:
            st.subheader("Pizza de Investimento por Obra")
            df_pizza = df_filtrado[mask_p].groupby('Obra')['Investimento'].sum().reset_index()
            if not df_pizza.empty and inv > 0:
                df_pizza['Percent'] = df_pizza['Investimento'] / inv
                
                base = alt.Chart(df_pizza).encode(
                    theta=alt.Theta("Investimento:Q", stack=True),
                    color=alt.Color("Obra:N", scale=alt.Scale(scheme='tableau20'))
                )
                
                pie = base.mark_arc(innerRadius=70, outerRadius=120, stroke="#fff")
                text = base.mark_text(radius=95, fill="white", size=14, fontWeight="bold").encode(
                    text=alt.Text("Percent:Q", format=".1%")
                ).transform_filter(alt.datum.Percent > 0.04)
                
                st.altair_chart(pie + text, use_container_width=True)
        
        with c2:
            st.subheader("Barras de Participação")
            if not df_pizza.empty:
                for _, row in df_pizza.sort_values('Investimento', ascending=False).iterrows():
                    p = row['Investimento'] / inv
                    st.write(f"**{row['Obra']}**")
                    st.progress(float(p))
                    st.caption(f"{p*100:.1f}% - R$ {row['Investimento']:,.2f}")

    else:
        st.title("📊 Painel de Assiduidade (Ponto)")
        total_dias = len(df_filtrado)
        presencas = len(df_filtrado[df_filtrado['Status'].str.contains('Presente', case=False, na=False)])
        perc = (presencas / total_dias * 100) if total_dias > 0 else 0

        m1, m2, m3 = st.columns(3)
        m1.metric("Total Chamadas", total_dias)
        m2.metric("Presenças ✅", presencas)
        m3.metric("Assiduidade Média", f"{perc:.1f}%")

        st.divider()

        st.subheader("📉 Presença vs Falta por Funcionário")
        df_ponto = df_filtrado.groupby(['Colaborador', 'Status']).size().reset_index(name='Dias')
        
        chart_bar = alt.Chart(df_ponto).mark_bar().encode(
            y=alt.Y('Colaborador:N', sort='-x', title=None),
            x=alt.X('Dias:Q', title='Dias'),
            color=alt.Color('Status:N', scale=alt.Scale(domain=['Presente', 'Ausente'], range=['#2ecc71', '#e74c3c'])),
            tooltip=['Colaborador', 'Status', 'Dias']
        ).properties(height=max(300, len(df_ponto['Colaborador'].unique()) * 25))
        st.altair_chart(chart_bar, use_container_width=True)

        st.subheader("🏆 Ranking de Assiduidade Individual")
        df_rank = df_filtrado.groupby('Colaborador')['Status'].value_counts().unstack().fillna(0)
        if 'Presente' in df_rank.columns:
            if 'Ausente' not in df_rank.columns: df_rank['Ausente'] = 0
            df_rank['Total'] = df_rank['Presente'] + df_rank['Ausente']
            df_rank['%'] = (df_rank['Presente'] / df_rank['Total'])
            for nome, row in df_rank.sort_values('%', ascending=False).iterrows():
                st.write(f"**{nome}**")
                st.progress(float(row['%']))
                st.caption(f"Presença: {row['%']*100:.1f}%")

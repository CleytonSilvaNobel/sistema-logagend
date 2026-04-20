/**
 * AIModule - Intelligent Assistant for LogAgend
 * Uses Google Gemini API for scheduling analysis and Q&A
 */

const AIModule = (() => {
    let isOpen = false;
    let messages = [];

    const getApiKey = () => Store.parameters?.gemini_api_key || '';
    const getModel = () => Store.parameters?.gemini_model || 'gemini-2.0-flash';

    const generateContext = () => {
        const schedules = Store.get('schedules') || [];
        const today = window.Utils ? window.Utils.getToday() : new Date().toISOString().split('T')[0];
        
        // Group by Date for the next 14 days to give AI clear numbers
        const dateSummary = {};
        schedules.forEach(s => {
            if (!dateSummary[s.data]) {
                dateSummary[s.data] = { pendente: 0, recebido: 0, count: 0 };
            }
            dateSummary[s.data].count++;
            if (s.status === 'PENDENTE') {
                dateSummary[s.data].pendente += (parseInt(s.volumes_estimados) || 0);
            } else if (s.status === 'RECEBIDO') {
                dateSummary[s.data].recebido += (parseInt(s.volumes_recebidos) || 0);
            }
        });

        const summaryRows = Object.keys(dateSummary)
            .sort()
            .filter(d => d >= today) // Only future and today
            .slice(0, 14)            // Next 2 weeks
            .map(d => `[Data:${d}|Pend:${dateSummary[d].pendente}|Rec:${dateSummary[d].recebido}|Agend:${dateSummary[d].count}]`)
            .join('\n');

        const totalVolumesEstimados = schedules.reduce((acc, s) => acc + (parseInt(s.volumes_estimados) || 0), 0);
        const totalVolumesRecebidos = schedules.reduce((acc, s) => acc + (parseInt(s.volumes_recebidos) || 0), 0);
        
        const sample = schedules.slice(-20).map(m => {
            return `[Data:${m.data}|Hora:${m.hora_inicio}|Status:${m.status}|VolEst:${m.volumes_estimados || 0}]`;
        }).join('\n');

        return `
        DATA ATUAL DO SISTEMA: ${today} (Utilize esta data para 'hoje', 'amanhã', 'próxima semana', etc.)
        REGRAS DE CALENDÁRIO: No LogAgend, a semana inicia no domingo.
        
        RESUMO CONSOLIDADO DE VOLUMES (POR DATA):
        ${summaryRows || 'Sem agendamentos futuros.'}

        TOTAIS GERAIS (HISTÓRICO):
        Total Agendamentos: ${schedules.length}
        Total Volumes Estimados (Histórico): ${totalVolumesEstimados}
        Total Volumes Recebidos (Histórico): ${totalVolumesRecebidos}

        ÚLTIMOS REGISTROS (DETALHE):
        ${sample}
        `;
    };

    const renderMessages = () => {
        const container = document.getElementById('ai-chat-messages');
        if (!container) return;
        
        container.innerHTML = messages.map(msg => `
            <div class="chat-msg ${msg.role}">
                ${msg.content.replace(/\n/g, '<br>')}
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    };

    const addMessage = (role, content) => {
        messages.push({ role, content });
        renderMessages();
        if (messages.length > 20) messages.shift();
    };

    const callAPI = async (prompt) => {
        const key = getApiKey();
        const model = getModel();
        
        if (!key) {
            return "Olá! A **Chave de API do Gemini** não está configurada no LogAgend. Peça ao administrador para inseri-la em **Gestão > Integrações**.";
        }

        if (!navigator.onLine) {
            return "Desculpe, você parece estar **offline**. Conecte-se à internet para usar o assistente de IA.";
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 4096,
                    }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            return data.candidates[0].content.parts[0].text;
        } catch (err) {
            console.error('AI Error:', err);
            return `Erro ao falar com a IA: ${err.message}. Verifique a chave e o limite de quota.`;
        }
    };

    return {
        toggle: () => {
            const userGroup = Store.get('groups').find(g => g.nome === Auth.currentUser?.grupo);
            if (!userGroup || !userGroup.permitir_ia) {
                alert('Seu grupo de usuário não tem permissão para usar o Assistente de IA.');
                return;
            }

            isOpen = !isOpen;
            const windowEl = document.getElementById('ai-chat-window');
            if (windowEl) windowEl.classList.toggle('active', isOpen);
            
            if (isOpen && messages.length === 0) {
                addMessage('assistant', 'Olá! Sou seu Assistente LogAgend. Posso ajudar a analisar agendamentos, identificar atrasos frequentes ou sugerir melhorias no fluxo das docas. Como posso ajudar?');
            }
        },

        sendMessage: async () => {
            const input = document.getElementById('ai-chat-input');
            const text = input.value.trim();
            if (!text) return;

            input.value = '';
            addMessage('user', text);
            
            const typingId = 'typing-' + Date.now();
            const container = document.getElementById('ai-chat-messages');
            container.innerHTML += `<div class="chat-msg assistant typing" id="${typingId}">...</div>`;
            container.scrollTop = container.scrollHeight;

            const context = generateContext();
            const fullPrompt = `
                Você é o Assistente LogAgend, especialista em logística e agendamento de recebimento de materiais da NobelPack.
                Sua principal característica é ser EXTREMAMENTE OBJETIVO E DIRETO. 
                Responda em poucas palavras ou tópicos concisos. Evite saudações longas ou textos desnecessários.
                
                IMPORTANTE: 
                - O usuário pode perguntar sobre volumetria pendente ou recebida.
                - Use sempre a "DATA ATUAL DO SISTEMA" abaixo para calcular períodos relativos.
                - Se perguntado sobre "próxima semana", some os volumes pendentes a partir do próximo domingo em relação à data atual.

                CONTEXTO ATUAL:
                ${context}
                
                PERGUNTA: ${text}
            `;

            const response = await callAPI(fullPrompt);
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();
            
            addMessage('assistant', response);
        },

        listAvailableModels: async () => {
            const key = getApiKey();
            if (!key) { alert('Configure a chave de API primeiro.'); return; }
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                const modelList = data.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''))
                    .join('\n');
                alert(`Modelos disponíveis:\n\n${modelList}`);
            } catch (err) {
                alert('Erro: ' + err.message);
            }
        }
    };
})();

// Expose to global scope for HTML onclick events
window.AIModule = AIModule;

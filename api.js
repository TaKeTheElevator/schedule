// api.js
const API_URL = 'http://46.8.21.39:3000/api';

class ClassAPI {
    static async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || 'Network response was not ok');
        }
        return await response.json();
    }

    // Получить всех участников класса
    static async getClassMembers(className) {
        try {
            const response = await fetch(`${API_URL}/class/${className}/members`);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching class members:', error);
            return [];
        }
    }

    // Присоединиться к классу
    static async joinClass(telegramId, className, userData) {
        try {
            const response = await fetch(`${API_URL}/class/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ telegramId, className, userData })
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error joining class:', error);
            throw error;
        }
    }

    // Выйти из класса
    static async leaveClass(telegramId) {
        try {
            const response = await fetch(`${API_URL}/class/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ telegramId })
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error leaving class:', error);
            throw error;
        }
    }

    // Получить информацию о пользователе
    static async getUserInfo(telegramId) {
        try {
            const response = await fetch(`${API_URL}/user/${telegramId}`);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching user info:', error);
            return null;
        }
    }

    // Получить статистику классов
    static async getClassStats() {
        try {
            const response = await fetch(`${API_URL}/classes/stats`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching class stats:', error);
            return [];
        }
    }

    static async updateUserStatus(telegramId, isOnline) {
        try {
            const response = await fetch(`${API_URL}/user/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ telegramId, isOnline })
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    }
}

// Добавим автоматическое обновление статуса
let updateStatusInterval;

function startStatusUpdates(telegramId) {
    // Обновляем статус сразу
    ClassAPI.updateUserStatus(telegramId, true);

    // Устанавливаем интервал обновления
    updateStatusInterval = setInterval(() => {
        ClassAPI.updateUserStatus(telegramId, true);
    }, 30000); // Каждые 30 секунд

    // Обработка закрытия страницы
    window.addEventListener('beforeunload', () => {
        ClassAPI.updateUserStatus(telegramId, false);
    });
}

function stopStatusUpdates() {
    if (updateStatusInterval) {
        clearInterval(updateStatusInterval);
    }
}

// Обновленные функции для работы с классами
async function joinClass(className) {
    if (!telegramUser) {
        showNotification('Необходимо войти в систему', 'error');
        return;
    }

    try {
        await ClassAPI.joinClass(telegramUser.id, className, telegramUser);
        
        // Обновляем интерфейс
        updateUserClassInfo(className);
        await loadAndShowClassMembers(className);
        selectClass(className);
        
        hideModal('joinClassModal');
        showNotification(`Вы присоединились к классу ${className.toUpperCase()}`);
        
        // Обновляем отображение участников в модальном окне классов
        await updateClassesModalContent();
    } catch (error) {
        showNotification('Ошибка при присоединении к классу', 'error');
    }
}

async function leaveClass(showNotify = true) {
    if (!telegramUser) return;

    try {
        await ClassAPI.leaveClass(telegramUser.id);
        
        // Обновляем интерфейс
        document.getElementById('sidebarUserClass').innerHTML = `
            <i class="fas fa-users mr-2"></i>
            <span>Не состоите в классе</span>
            <button class="ml-2 text-telegram-link" onclick="showJoinClassModal()">
                <i class="fas fa-plus"></i> Присоединиться
            </button>
        `;
        
        document.getElementById('classMembers').style.display = 'none';
        
        // Обновляем отображение участников в модальном окне классов
        await updateClassesModalContent();
        
        if (showNotify) {
            showNotification('Вы вышли из класса');
        }
    } catch (error) {
        if (showNotify) {
            showNotification('Ошибка при выходе из класса', 'error');
        }
    }
}

async function loadAndShowClassMembers(className) {
    try {
        const members = await ClassAPI.getClassMembers(className);
        const membersList = document.getElementById('classMembersList');
        const classMemebersBlock = document.getElementById('classMembers');
        
        if (members && members.length > 0) {
            membersList.innerHTML = members.map(member => `
                <div class="flex items-center py-2">
                    <img src="${member.photoUrl || 'path/to/default/avatar.png'}" 
                         alt="${member.firstName}" 
                         class="w-8 h-8 rounded-full mr-2">
                    <div>
                        <div class="font-medium">${member.firstName} ${member.lastName}</div>
                        <div class="text-xs text-telegram-hint">@${member.username}</div>
                    </div>
                </div>
            `).join('');
            
            classMemebersBlock.style.display = 'block';
        } else {
            classMemebersBlock.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading class members:', error);
    }
}

async function updateClassesModalContent() {
    const classes = ['10a', '10b', '11a', '11b'];
    const classNames = {
        '10a': '10 А',
        '10b': '10 Б',
        '11a': '11 А',
        '11b': '11 Б'
    };
    
    for (const className of classes) {
        try {
            const members = await ClassAPI.getClassMembers(className);
            const countElement = document.getElementById(`modal${className}Count`);
            const membersContainer = document.getElementById(`modal${className}Members`);
            
            const count = members.length;
            countElement.textContent = `${count} ${declOfNum(count, ['участник', 'участника', 'участников'])}`;
            
            if (count > 0) {
                membersContainer.innerHTML = members.map(member => `
                    <div class="flex items-center py-2 border-b border-telegram-blue/10 last:border-0">
                        <img src="${member.photoUrl || 'path/to/default/avatar.png'}" 
                             alt="${member.firstName}" 
                             class="w-8 h-8 rounded-full mr-2">
                        <div>
                            <div class="font-medium">${member.firstName} ${member.lastName}</div>
                            <div class="text-xs text-telegram-hint">@${member.username}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                membersContainer.innerHTML = `
                    <div class="text-center text-telegram-hint py-4">
                        В классе ${classNames[className]} пока нет участников
                    </div>
                `;
            }
        } catch (error) {
            console.error(`Error updating class ${className}:`, error);
        }
    }
}

// Экспортируем API и функции для использования в основном коде
window.ClassAPI = ClassAPI;
window.startStatusUpdates = startStatusUpdates;
window.stopStatusUpdates = stopStatusUpdates;

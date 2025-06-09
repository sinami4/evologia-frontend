document.addEventListener('DOMContentLoaded', function() {
    // --- ОСНОВНЫЕ ЭЛЕМЕНТЫ DOM (СУЩЕСТВУЮЩИЕ И НОВЫЕ) ---
    const searchInput = document.getElementById('queryInput'); 
    const searchSection = document.getElementById('search-section'); 
    const savedArticlesSection = document.getElementById('saved-articles-section'); 
    const articleListContainer = document.getElementById('articleListContainer');
    const noSavedArticlesMessage = document.getElementById('noSavedArticlesMessage');
    const generatorControls = document.getElementById('generatorControls');
    const noSearchResultsMessage = document.getElementById('noSearchResultsMessage'); 
    const generateNewButton = document.getElementById('evoGenerateNewArticleButton'); 
    const loadingIndicator = document.getElementById('evoLoadingIndicator'); 
    const newArticleOutput = document.getElementById('evoNewArticleOutput'); 

    // Новые элементы для аутентификации
    const authNav = document.getElementById('authNav'); // Контейнер для кнопок Войти/Регистрация в шапке
    const userInfoDisplay = document.getElementById('userInfo'); // Контейнер для "Привет, Имя! / Выйти"
    const loggedInUsernameSpan = document.getElementById('loggedInUsername');
    const logoutButton = document.getElementById('logoutButton');
    const showLoginModalButton = document.getElementById('showLoginModalButton'); // Кнопка "Войти" в шапке
    const showRegisterModalButton = document.getElementById('showRegisterModalButton'); // Кнопка "Регистрация" в шапке
    
    const authFormsSection = document.getElementById('auth-forms-section'); // Общая секция для форм
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegisterLink = document.getElementById('switchToRegisterLink'); // Ссылка "Зарегистрироваться" под формой логина
    const switchToLoginLink = document.getElementById('switchToLoginLink');   // Ссылка "Войти" под формой регистрации
    const loginErrorP = document.getElementById('loginError');
    const registerErrorP = document.getElementById('registerError');

    // --- URL БЭКЕНДА ---
    const backendUrl = 'https://evologia-backend.onrender.com'; 
    let allSavedArticlesData = []; 
    let currentUser = null; 

    console.log("EvoLogia: DOMContentLoaded, скрипт запущен.");

    // --- ПРОВЕРКА НАЛИЧИЯ КЛЮЧЕВЫХ ЭЛЕМЕНТОВ ---
    function checkEssentialElements() {
        let allEssentialExist = true;
        if (!searchInput) { console.error('EvoLogia ERROR: Поле поиска "queryInput" не найдено!'); allEssentialExist = false; }
        if (!articleListContainer) { console.error('EvoLogia ERROR: Контейнер "articleListContainer" не найдено!'); allEssentialExist = false; }
        // generateNewButton может быть не критичным, если он появляется динамически
        // if (!generateNewButton) { console.error('EvoLogia ERROR: Кнопка "evoGenerateNewArticleButton" не найдена!'); allEssentialExist = false; }
        if (!newArticleOutput) { console.error('EvoLogia ERROR: Область "evoNewArticleOutput" не найдена!'); allEssentialExist = false; }
        // Элементы аутентификации
        if (!authNav) console.warn('EvoLogia WARN: #authNav не найден.');
        if (!userInfoDisplay) console.warn('EvoLogia WARN: #userInfo не найден.');
        if (!showLoginModalButton) console.warn('EvoLogia WARN: #showLoginModalButton не найден.');
        if (!showRegisterModalButton) console.warn('EvoLogia WARN: #showRegisterModalButton не найден.');
        if (!authFormsSection) { console.error('EvoLogia ERROR: Секция форм "#auth-forms-section" не найдена!'); allEssentialExist = false; }
        if (!loginForm) { console.error('EvoLogia ERROR: Форма входа "loginForm" не найдена!'); allEssentialExist = false; }
        if (!registerForm) { console.error('EvoLogia ERROR: Форма регистрации "registerForm" не найдена!'); allEssentialExist = false; }
        return allEssentialExist;
    }
    checkEssentialElements(); // Выполняем проверку при загрузке
    
    // --- УПРАВЛЕНИЕ СОСТОЯНИЕМ ПОЛЬЗОВАТЕЛЯ И UI АУТЕНТИФИКАЦИИ ---
    function updateAuthUI() {
        console.log("EvoLogia: Вызвана updateAuthUI(). currentUser:", currentUser);
        const token = localStorage.getItem('evoUserToken');
        if (token && currentUser && currentUser.username) { // Проверяем и токен, и данные пользователя
            if (authNav) authNav.style.display = 'none';
            if (userInfoDisplay) userInfoDisplay.style.display = 'flex'; 
            if (loggedInUsernameSpan) loggedInUsernameSpan.textContent = currentUser.username;
        } else {
            if (authNav) authNav.style.display = 'flex';
            if (userInfoDisplay) userInfoDisplay.style.display = 'none';
            if (loggedInUsernameSpan) loggedInUsernameSpan.textContent = '';
        }
        // Скрываем секцию с формами по умолчанию при обновлении UI (если она не должна быть активной)
        if (authFormsSection && authFormsSection.style.display === 'block' && 
            (!loginFormContainer || loginFormContainer.style.display === 'none') && 
            (!registerFormContainer || registerFormContainer.style.display === 'none')) {
            authFormsSection.style.display = 'none';
        }
    }

    async function checkAuthState() {
        console.log("EvoLogia: Вызвана checkAuthState()");
        const token = localStorage.getItem('evoUserToken');
        if (token) {
            try {
                loadingIndicatorShow('Проверка сессии...');
                const response = await fetch(`${backendUrl}/api/auth/me`, {
                    method: 'GET', // Явно указываем метод
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    currentUser = await response.json();
                    console.log('EvoLogia: Пользователь аутентифицирован при проверке:', currentUser);
                } else {
                    const errorData = await response.text(); // Попытка получить текст ошибки
                    console.warn(`EvoLogia: Токен невалиден или сессия истекла (статус: ${response.status}). Ответ: ${errorData}. Удаляем токен.`);
                    localStorage.removeItem('evoUserToken'); currentUser = null;
                }
            } catch (error) {
                console.error('EvoLogia: Ошибка при проверке состояния аутентификации:', error);
                localStorage.removeItem('evoUserToken'); currentUser = null;
            } finally {
                loadingIndicatorHide();
            }
        } else {
            currentUser = null;
            console.log('EvoLogia: Токен не найден, пользователь не аутентифицирован.');
        }
        updateAuthUI();
    }
    
    function loadingIndicatorShow(message = "Загрузка...") {
        if (loadingIndicator) { loadingIndicator.textContent = message; loadingIndicator.style.display = 'block'; }
    }
    function loadingIndicatorHide(defaultMessage = "Идет генерация статьи, пожалуйста, подождите...") {
        if (loadingIndicator) { loadingIndicator.style.display = 'none'; loadingIndicator.textContent = defaultMessage; }
    }

    function showAuthForm(formType) {
        console.log(`EvoLogia: Попытка показать форму: ${formType}`);
        if (authFormsSection && loginFormContainer && registerFormContainer) {
            showView('auth'); 
            if (formType === 'login') {
                loginFormContainer.style.display = 'block'; registerFormContainer.style.display = 'none';
                if(loginErrorP) { loginErrorP.style.display = 'none'; loginErrorP.textContent = ''; }
                if(loginForm) loginForm.reset();
            } else if (formType === 'register') {
                loginFormContainer.style.display = 'none'; registerFormContainer.style.display = 'block';
                if(registerErrorP) { registerErrorP.style.display = 'none'; registerErrorP.textContent = ''; }
                if(registerForm) registerForm.reset();
            }
        } else {
            console.error("EvoLogia ERROR: Не найдены контейнеры форм аутентификации для показа!");
        }
    }

    if (showLoginModalButton) showLoginModalButton.addEventListener('click', () => showAuthForm('login'));
    if (showRegisterModalButton) showRegisterModalButton.addEventListener('click', () => showAuthForm('register'));
    if (switchToRegisterLink) switchToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('register'); });
    if (switchToLoginLink) switchToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('login'); });

    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log("EvoLogia: Событие submit формы регистрации.");
            if (registerErrorP) { registerErrorP.style.display = 'none'; registerErrorP.textContent = '';}
            const usernameInput = document.getElementById('registerUsername');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            if (!usernameInput || !emailInput || !passwordInput) {
                if (registerErrorP) { registerErrorP.textContent = 'Ошибка формы.'; registerErrorP.style.display = 'block'; } return;
            }
            const username = usernameInput.value.trim(); const email = emailInput.value.trim(); const password = passwordInput.value;
            if (!username || !email || !password) { if (registerErrorP) { registerErrorP.textContent = 'Все поля обязательны.'; registerErrorP.style.display = 'block'; } return; }
            if (password.length < 6) { if (registerErrorP) { registerErrorP.textContent = 'Пароль не менее 6 символов.'; registerErrorP.style.display = 'block'; } return; }
            
            loadingIndicatorShow('Регистрация...');
            try {
                const response = await fetch(`${backendUrl}/api/auth/register`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.error || `Ошибка: ${response.status}`); }
                localStorage.setItem('evoUserToken', data.access_token); currentUser = data.user;
                alert('Регистрация успешна! Вы вошли.'); updateAuthUI(); showView('list');
            } catch (error) { if (registerErrorP) { registerErrorP.textContent = error.message; registerErrorP.style.display = 'block'; }} 
            finally { loadingIndicatorHide(); }
        });
    } else { console.error('EvoLogia FATAL: Форма registerForm НЕ НАЙДЕНА!'); }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log("EvoLogia: Событие submit формы входа.");
            if (loginErrorP) { loginErrorP.style.display = 'none'; loginErrorP.textContent = ''; }
            const identifierInput = document.getElementById('loginIdentifier');
            const passwordInput = document.getElementById('loginPassword');
            if(!identifierInput || !passwordInput) { if (loginErrorP) { loginErrorP.textContent = 'Ошибка формы.'; loginErrorP.style.display = 'block'; } return; }
            const identifier = identifierInput.value.trim(); const password = passwordInput.value;
            if (!identifier || !password) { if (loginErrorP) { loginErrorP.textContent = 'Все поля обязательны.'; loginErrorP.style.display = 'block'; } return; }
            
            loadingIndicatorShow('Вход...');
            try {
                const payload = {};
                if (identifier.includes('@')) { payload.email = identifier; } else { payload.username = identifier; }
                payload.password = password;
                const response = await fetch(`${backendUrl}/api/auth/login`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.error || `Ошибка: ${response.status}`); }
                localStorage.setItem('evoUserToken', data.access_token); currentUser = data.user;
                alert('Вход успешен!'); updateAuthUI(); showView('list');
            } catch (error) { if (loginErrorP) { loginErrorP.textContent = error.message; loginErrorP.style.display = 'block'; }
            } finally { loadingIndicatorHide(); }
        });
    } else { console.error('EvoLogia FATAL: Форма loginForm НЕ НАЙДЕНА!'); }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            console.log("EvoLogia: Клик по 'Выйти'.");
            localStorage.removeItem('evoUserToken'); currentUser = null;
            alert('Вы вышли из системы.'); updateAuthUI(); showView('list');
        });
    } else { console.warn("EvoLogia WARN: Кнопка 'logoutButton' не найдена.");}

    // --- КОПИРУЮ ТВОИ СУЩЕСТВУЮЩИЕ ФУНКЦИИ ИЗ ПРЕДЫДУЩЕГО КОДА ---
    function showView(viewName) { 
        if (searchSection) searchSection.style.display = 'none';
        if (savedArticlesSection) savedArticlesSection.style.display = 'none';
        if (generatorControls) generatorControls.style.display = 'none';
        if (newArticleOutput) {
             newArticleOutput.style.display = 'none';
             if(viewName !== 'fullArticle' && viewName !== 'generating' && !newArticleOutput.querySelector('#evoPublishGeneratedArticleButton')) {
                 newArticleOutput.innerHTML = '';
             }
        }
        if (authFormsSection) authFormsSection.style.display = 'none'; // Эту строку мы уже добавили выше
        console.log(`EvoLogia: Переключение вида на: ${viewName}`);
        if (viewName === 'list') { 
            if (searchSection) searchSection.style.display = 'block';
            if (savedArticlesSection) savedArticlesSection.style.display = 'block';
            filterAndManageUI(); 
        } else if (viewName === 'fullArticle') { 
            if (newArticleOutput) newArticleOutput.style.display = 'block'; 
        } else if (viewName === 'generating') { 
            if (searchSection && searchInput && searchInput.value) {
                 searchSection.style.display = 'block';
            }
            if (newArticleOutput) newArticleOutput.style.display = 'block'; 
        } else if (viewName === 'auth') { // Эта ветка теперь управляет видимостью authFormsSection
             if (authFormsSection) authFormsSection.style.display = 'block';
        }
    }

    function renderSavedArticleItem(articleData) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('article-list-item'); 
        itemDiv.dataset.id = articleData.id; 
        const titleH3 = document.createElement('h3');
        titleH3.classList.add('article-list-title'); 
        titleH3.textContent = articleData.title;
        itemDiv.appendChild(titleH3);
        itemDiv.addEventListener('click', function() {
            displayFullArticle(articleData.id); 
        });
        return itemDiv;
    }

    function renderCommentItem(commentData) {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment-item');
        const authorP = document.createElement('p');
        authorP.classList.add('comment-author');
        authorP.innerHTML = `<strong>${commentData.author_name || 'Аноним'}</strong> <span class="comment-date">(${new Date(commentData.created_at).toLocaleString()})</span>:`;
        const textP = document.createElement('p');
        textP.classList.add('comment-text');
        textP.textContent = commentData.text;
        commentDiv.appendChild(authorP); commentDiv.appendChild(textP);
        return commentDiv;
    }

    async function displayFullArticle(articleId) {
        if (!newArticleOutput || !loadingIndicator) { console.error("EvoLogia: Отсутствуют элементы DOM для displayFullArticle."); return; }
        showView('generating'); 
        loadingIndicatorShow('Загрузка статьи и комментариев...');
        newArticleOutput.innerHTML = ''; 
        try {
            const articleResponse = await fetch(`${backendUrl}/api/articles/${articleId}`);
            if (!articleResponse.ok) { 
                let errorText = `Ошибка загрузки статьи: ${articleResponse.status}`;
                try { const errorData = await articleResponse.json(); errorText = errorData.error || errorText; } catch(e){}
                throw new Error(errorText); 
            }
            const fullArticleData = await articleResponse.json();
            newArticleOutput.innerHTML = fullArticleData.content_html; 
            
            const commentsSectionDiv = document.createElement('div'); commentsSectionDiv.id = 'comments-section';
            commentsSectionDiv.innerHTML = '<h3>Комментарии:</h3>'; 
            const commentsListDiv = document.createElement('div'); commentsListDiv.id = 'comments-list';
            commentsSectionDiv.appendChild(commentsListDiv);
            const hrComments = document.createElement('hr'); hrComments.style.cssText = "margin-top:25px; margin-bottom:20px;";
            newArticleOutput.appendChild(hrComments); newArticleOutput.appendChild(commentsSectionDiv);

            try {
                const commentsResponse = await fetch(`${backendUrl}/api/articles/${articleId}/comments`);
                if (commentsResponse.ok) {
                    const commentsData = await commentsResponse.json();
                    if (commentsData && commentsData.length > 0) {
                        commentsData.forEach(comment => commentsListDiv.appendChild(renderCommentItem(comment)));
                    } else { commentsListDiv.innerHTML = '<p class="no-comments-yet" style="color: #777; font-style: italic;">Комментариев пока нет.</p>'; }
                } else { commentsListDiv.innerHTML = '<p style="color: #777;">Не удалось загрузить комментарии.</p>'; }
            } catch (commentsError) { commentsListDiv.innerHTML = `<p style="color: red;">Ошибка загрузки комментариев.</p>`; }
            
            const addCommentForm = document.createElement('form'); addCommentForm.id = 'add-comment-form';
            addCommentForm.innerHTML = `<h4>Оставить комментарий:</h4>
                <div id="commentAuthorNameDiv"><label for="commentAuthorNameInput">Ваше имя (если не вошли):</label><input type="text" id="commentAuthorNameInput" name="author_name" maxlength="100"></div>
                <div><label for="commentTextInput">Комментарий:</label><textarea id="commentTextInput" name="text" rows="4" required></textarea></div>
                <button type="submit" id="submitCommentButton">Отправить</button>`;
            commentsSectionDiv.appendChild(addCommentForm); 

            const authorNameFieldDiv = addCommentForm.querySelector('#commentAuthorNameDiv');
            if (currentUser && authorNameFieldDiv) { authorNameFieldDiv.style.display = 'none'; }
            else if (authorNameFieldDiv) { authorNameFieldDiv.style.display = 'block';}
            
            addCommentForm.addEventListener('submit', async function(event) {
                event.preventDefault(); 
                const commentTextInputVal = document.getElementById('commentTextInput').value.trim();
                if (!commentTextInputVal) { alert('Введите текст комментария.'); return; }
                const submitButton = document.getElementById('submitCommentButton');
                if(submitButton) submitButton.disabled = true;
                const token = localStorage.getItem('evoUserToken');
                const headers = { 'Content-Type': 'application/json' };
                if (token) { headers['Authorization'] = `Bearer ${token}`; }
                const payload = { text: commentTextInputVal };
                if (!currentUser && authorNameFieldDiv && authorNameFieldDiv.style.display !== 'none') {
                    const authorNameInputVal = document.getElementById('commentAuthorNameInput').value.trim();
                    if (authorNameInputVal) payload.author_name = authorNameInputVal;
                }
                try {
                    const response = await fetch(`${backendUrl}/api/articles/${articleId}/comments`, {
                        method: 'POST', headers: headers, body: JSON.stringify(payload)
                    });
                    if (!response.ok) { let errTxt = `Ошибка: ${response.status}`; try{const eD=await response.json();errTxt=eD.error||errTxt;}catch(e){} throw new Error(errTxt); }
                    const newCommentData = await response.json();
                    const noCommentsP = commentsListDiv.querySelector('p.no-comments-yet'); if(noCommentsP) noCommentsP.remove();
                    commentsListDiv.appendChild(renderCommentItem(newCommentData.comment)); // Используем newCommentData.comment
                    if(document.getElementById('commentTextInput')) document.getElementById('commentTextInput').value = '';
                    const authorInput = document.getElementById('commentAuthorNameInput'); if(authorInput) authorInput.value = '';
                } catch (error) { alert(`Не удалось отправить комментарий: ${error.message}`); } 
                finally { if(submitButton) submitButton.disabled = false; }
            });
            const backButton = document.createElement('button'); backButton.id = 'evoBackToListButton';
            backButton.textContent = '‹ Назад к списку статей'; 
            backButton.addEventListener('click', function() { showView('list'); });
            const hrAfter = document.createElement('hr'); hrAfter.style.marginTop = '20px';
            newArticleOutput.appendChild(hrAfter); newArticleOutput.appendChild(backButton); 
            showView('fullArticle'); 
        } catch (error) { 
            newArticleOutput.innerHTML = `<p style="color:red; text-align:center;">Не удалось загрузить статью: ${error.message}</p>`;
            const backOnError = document.createElement('button'); backOnError.textContent = '‹ Назад к списку';
            backOnError.id = 'evoBackToListButton'; 
            backOnError.onclick = () => showView('list'); newArticleOutput.appendChild(backOnError);
            showView('fullArticle');
        } finally { loadingIndicatorHide('Идет генерация статьи, пожалуйста, подождите...'); }
    }
    
    async function fetchAndDisplaySavedArticles() { 
        if (!articleListContainer) { console.error("EvoLogia: articleListContainer не найден."); return; }
        if (noSavedArticlesMessage) noSavedArticlesMessage.style.display = 'none';
        articleListContainer.innerHTML = '<p style="text-align:center; color:#777;">Загрузка сохраненных статей...</p>'; 
        try {
            const response = await fetch(`${backendUrl}/api/articles`);
            if (!response.ok) { throw new Error(`Ошибка сервера: ${response.status}`);}
            const responseData = await response.json(); 
            allSavedArticlesData = (responseData && Array.isArray(responseData.articles)) ? responseData.articles : [];
            articleListContainer.innerHTML = ''; 
            if (allSavedArticlesData.length > 0) {
                allSavedArticlesData.forEach(article => articleListContainer.appendChild(renderSavedArticleItem(article)));
            }
        } catch (error) { 
            if (articleListContainer) articleListContainer.innerHTML = `<p style="color: red;">Ошибка загрузки статей: ${error.message}</p>`;
            allSavedArticlesData = []; 
        } finally { showView('list'); }
    }

    function filterAndManageUI() { 
        if (!searchInput || !articleListContainer) { if (generatorControls) generatorControls.style.display = 'none'; return; }
        const filterText = searchInput.value.toLowerCase().trim();
        let visibleArticlesCount = 0;
        if (newArticleOutput && newArticleOutput.style.display !== 'block' && !newArticleOutput.querySelector('#evoPublishGeneratedArticleButton')) {
            newArticleOutput.innerHTML = '';
        }
        
        // Фильтруем на основе данных в allSavedArticlesData и обновляем видимость DOM-элементов
        allSavedArticlesData.forEach(articleData => {
            const articleElement = articleListContainer.querySelector(`.article-list-item[data-id="${articleData.id}"]`);
            if (!articleElement) return; // Если элемент еще не создан в DOM (например, при первой загрузке)
            
            const titleText = articleData.title.toLowerCase();
            let shouldBeVisible = (filterText === '' || titleText.includes(filterText));
            
            if (shouldBeVisible) { 
                articleElement.style.setProperty('display', ''); 
                visibleArticlesCount++; 
            } else { 
                articleElement.style.setProperty('display', 'none', 'important'); 
            }
        });

        if (noSavedArticlesMessage) {
            if (allSavedArticlesData.length === 0 && filterText === '') {
                noSavedArticlesMessage.textContent = "Сохраненных статей пока нет. Попробуйте сгенерировать новую!";
                noSavedArticlesMessage.style.display = 'block';
            } else { 
                noSavedArticlesMessage.style.display = 'none';  
            }
        }
        if (generatorControls && generateNewButton && noSearchResultsMessage) {
            if (savedArticlesSection && savedArticlesSection.style.display === 'block') { 
                if (filterText !== '' && visibleArticlesCount === 0 && allSavedArticlesData.length > 0) { // Показываем, если есть что фильтровать, но не нашлось
                    generatorControls.style.display = 'block'; 
                    noSearchResultsMessage.style.display = 'block';
                    generateNewButton.style.display = 'block'; 
                    generateNewButton.disabled = false;
                } else if (filterText !== '' && allSavedArticlesData.length === 0) { // Если статей вообще нет, но что-то введено в поиск
                     generatorControls.style.display = 'block'; 
                     noSearchResultsMessage.style.display = 'block'; // Можно изменить текст
                     generateNewButton.style.display = 'block'; 
                     generateNewButton.disabled = false;
                }
                else { 
                    generatorControls.style.display = 'none'; 
                }
            } else { 
                 generatorControls.style.display = 'none'; 
            }
        }
    }

    if (searchInput) { 
        searchInput.addEventListener('input', function() {
            if (authFormsSection && authFormsSection.style.display === 'block') {
                // Если открыты формы логина/регистрации, не переключаем вид при вводе в поиск
            } else {
                 showView('list'); // Переключаемся на вид списка при вводе в поиск
            }
        });
    }

    async function publishGeneratedArticle(title, contentHtml, searchQuery) { 
        const publishButton = document.getElementById('evoPublishGeneratedArticleButton');
        loadingIndicatorShow("Публикация статьи...");
        if (generateNewButton) generateNewButton.disabled = true; // Блокируем и кнопку генерации
        if (publishButton) publishButton.disabled = true;
        try {
            const response = await fetch(`${backendUrl}/api/articles`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title, content_html: contentHtml, search_query: searchQuery })
            });
            if (!response.ok) { 
                let errorText = `Ошибка публикации: ${response.status}`;
                try{const eD=await response.json(); errorText = eD.error || errorText;}catch(e){}
                throw new Error(errorText); 
            }
            alert('Статья успешно опубликована!');
            if (searchInput) searchInput.value = ''; 
            await fetchAndDisplaySavedArticles(); // Это уже вызовет showView('list') и filterAndManageUI
        } catch (error) {
            alert(`Не удалось опубликовать статью: ${error.message}`);
            if (generateNewButton && generatorControls && generatorControls.style.display === 'block') {
                 generateNewButton.disabled = false; // Разблокируем, если она была видима
            }
            if(publishButton) publishButton.disabled = false; // Разблокируем кнопку публикации
        } finally { 
            loadingIndicatorHide("Идет генерация статьи, пожалуйста, подождите..."); 
        }
    }

    if (generateNewButton) {
        generateNewButton.addEventListener('click', async function() { 
            if (!searchInput) return;
            const userQuery = searchInput.value.trim();
            if (!userQuery) { alert('Введите тему для генерации.'); return; }
            showView('generating'); 
            loadingIndicatorShow("Генерация статьи...");
            if(newArticleOutput) newArticleOutput.innerHTML = ''; 
            generateNewButton.disabled = true;
            try {
                const response = await fetch(`${backendUrl}/generate-article`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: userQuery }) 
                });
                if (!response.ok) { 
                    let errorText = `Ошибка генерации: ${response.status}`;
                    try{const eD=await response.json(); errorText = eD.error || errorText;}catch(e){}
                    throw new Error(errorText); 
                }
                const data = await response.json();
                if (newArticleOutput) {
                    // Вставляем HTML от ИИ (он уже должен содержать главный заголовок)
                    newArticleOutput.innerHTML = data.article; 
                    
                    const existingPublishButton = document.getElementById('evoPublishGeneratedArticleButton');
                    if (existingPublishButton) existingPublishButton.remove(); 
                    const existingHr = newArticleOutput.querySelector('hr.publish-separator');
                    if (existingHr) existingHr.remove();

                    const publishButton = document.createElement('button');
                    publishButton.id = 'evoPublishGeneratedArticleButton';
                    publishButton.textContent = 'Опубликовать эту статью';
                    // Стили для кнопки уже есть в CSS
                    publishButton.addEventListener('click', function() {
                        let articleHtmlToPublish = newArticleOutput.innerHTML;
                        // Извлекаем заголовок ИЗ СГЕНЕРИРОВАННОГО HTML для публикации
                        let articleTitleForPublish = userQuery; // Заголовок по умолчанию - это поисковый запрос
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = data.article; // Парсим HTML, который пришел от ИИ
                        const h2Element = tempDiv.querySelector('h2'); // Ищем первый H2
                        if (h2Element && h2Element.textContent.trim()) {
                            articleTitleForPublish = h2Element.textContent.trim();
                        }
                        
                        // Удаляем кнопку и разделитель перед сохранением HTML
                        const buttonToRemoveHTML = newArticleOutput.querySelector('#evoPublishGeneratedArticleButton');
                        const hrToRemoveHTML = newArticleOutput.querySelector('hr.publish-separator');
                        let finalHtmlToPublish = data.article; // Берем исходный HTML от ИИ
                        // Если кнопка и hr были добавлены в newArticleOutput.innerHTML, их нужно удалять оттуда
                        // Но лучше передавать в publishGeneratedArticle чистый data.article
                        
                        publishGeneratedArticle(articleTitleForPublish, data.article, userQuery);
                    });
                    const hrElement = document.createElement('hr'); hrElement.className = 'publish-separator'; 
                    newArticleOutput.appendChild(hrElement); 
                    newArticleOutput.appendChild(publishButton);
                }
            } catch (error) { 
                if (newArticleOutput) newArticleOutput.innerHTML = `<p style="color: red;">Произошла ошибка при генерации: ${error.message}</p>`;
                 showView('list'); 
            } 
            finally { 
                loadingIndicatorHide(); 
                // filterAndManageUI() вызовется из showView('list'), если была ошибка,
                // или останется на виде 'generating' (который покажет newArticleOutput) если успешно.
                // Если успешно, то showView('generating') оставит newArticleOutput видимым.
                // Нужно решить, переключать ли на 'list' после генерации или оставлять предпросмотр.
                // Пока оставляем так: если ошибка - на список, если успех - остается предпросмотр.
                if (!newArticleOutput.querySelector('#evoPublishGeneratedArticleButton') && newArticleOutput.style.display === 'block'){
                     // Если была ошибка и нет кнопки публикации, значит, нужно показать список
                     showView('list');
                } else if (newArticleOutput.style.display === 'block') {
                    // Если есть кнопка публикации, значит, мы на виде предпросмотра
                    // filterAndManageUI() не нужен, т.к. список статей скрыт
                } else {
                    filterAndManageUI(); // Если что-то пошло не так и мы не на предпросмотре
                }
            }
        });
    }

    // --- НАЧАЛЬНАЯ ЗАГРУЗКА И ПРОВЕРКА СОСТОЯНИЯ АУТЕНТИФИКАЦИИ ---
    async function initializeApp() {
        console.log("EvoLogia: Инициализация приложения...");
        await checkAuthState(); 
        if (articleListContainer) { 
          await fetchAndDisplaySavedArticles(); // Это вызовет showView('list') и filterAndManageUI в конце
        } else {
          showView('list'); // Если нет контейнера, просто показываем вид списка по умолчанию
        }
        console.log("EvoLogia: Приложение инициализировано.");
    }
    initializeApp(); 
});
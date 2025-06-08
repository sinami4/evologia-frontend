document.addEventListener('DOMContentLoaded', function() {
    // --- ОСНОВНЫЕ ЭЛЕМЕНТЫ DOM ---
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
    const authNav = document.getElementById('authNav');
    const userInfoDisplay = document.getElementById('userInfo');
    const loggedInUsernameSpan = document.getElementById('loggedInUsername');
    const logoutButton = document.getElementById('logoutButton');
    const showLoginModalButton = document.getElementById('showLoginModalButton');
    const showRegisterModalButton = document.getElementById('showRegisterModalButton');
    const authFormsSection = document.getElementById('auth-forms-section');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegisterLink = document.getElementById('switchToRegisterLink');
    const switchToLoginLink = document.getElementById('switchToLoginLink');
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
        if (!articleListContainer) { console.error('EvoLogia ERROR: Контейнер "articleListContainer" не найден!'); allEssentialExist = false; }
        if (!generateNewButton) { console.error('EvoLogia ERROR: Кнопка "evoGenerateNewArticleButton" не найдена!'); allEssentialExist = false; }
        if (!newArticleOutput) { console.error('EvoLogia ERROR: Область "evoNewArticleOutput" не найдена!'); allEssentialExist = false; }
        if (!authFormsSection) { console.error('EvoLogia ERROR: Секция форм "#auth-forms-section" не найдена!'); allEssentialExist = false; }
        if (!loginForm) { console.error('EvoLogia ERROR: Форма входа "loginForm" не найдена!'); allEssentialExist = false; }
        if (!registerForm) { console.error('EvoLogia ERROR: Форма регистрации "registerForm" не найдена!'); allEssentialExist = false; }
        if (!authNav) console.warn('EvoLogia WARN: Контейнер навигации "#authNav" не найден.');
        if (!userInfoDisplay) console.warn('EvoLogia WARN: Контейнер информации о пользователе "#userInfo" не найден.');
        return allEssentialExist;
    }
    if (!checkEssentialElements()) {
        console.error("EvoLogia FATAL: Отсутствуют один или несколько критически важных элементов DOM. Дальнейшая работа скрипта может быть нарушена.");
        // Можно даже прервать выполнение, если совсем критично, но пока оставим так.
    }
    
    // --- УПРАВЛЕНИЕ СОСТОЯНИЕМ ПОЛЬЗОВАТЕЛЯ И UI АУТЕНТИФИКАЦИИ ---
    function updateAuthUI() {
        console.log("EvoLogia: Вызвана updateAuthUI(). currentUser:", currentUser);
        const token = localStorage.getItem('evoUserToken');
        if (token && currentUser) {
            if (authNav) authNav.style.display = 'none';
            if (userInfoDisplay) userInfoDisplay.style.display = 'flex'; // Используем flex для корректного отображения
            if (loggedInUsernameSpan) loggedInUsernameSpan.textContent = currentUser.username;
        } else {
            if (authNav) authNav.style.display = 'flex';
            if (userInfoDisplay) userInfoDisplay.style.display = 'none';
            if (loggedInUsernameSpan) loggedInUsernameSpan.textContent = '';
        }
        // Всегда скрываем секцию с формами при обновлении основного UI
        if (authFormsSection) authFormsSection.style.display = 'none';
    }

    async function checkAuthState() {
        console.log("EvoLogia: Вызвана checkAuthState()");
        const token = localStorage.getItem('evoUserToken');
        if (token) {
            try {
                loadingIndicatorShow('Проверка сессии...');
                const response = await fetch(`${backendUrl}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    currentUser = await response.json();
                    console.log('EvoLogia: Пользователь аутентифицирован при проверке:', currentUser);
                } else {
                    console.warn('EvoLogia: Токен невалиден или сессия истекла, удаляем токен.');
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
        updateAuthUI(); // Обновляем UI после проверки
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

    if (showLoginModalButton) {
        showLoginModalButton.addEventListener('click', () => {
            console.log("EvoLogia: Клик по кнопке 'Войти' в шапке.");
            showAuthForm('login');
        });
    } else { console.warn("EvoLogia WARN: Кнопка 'showLoginModalButton' не найдена."); }

    if (showRegisterModalButton) {
        showRegisterModalButton.addEventListener('click', () => {
            console.log("EvoLogia: Клик по кнопке 'Регистрация' в шапке.");
            showAuthForm('register');
        });
    } else { console.warn("EvoLogia WARN: Кнопка 'showRegisterModalButton' не найдена."); }
    
    if (switchToRegisterLink) {
        switchToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('register'); });
    } else { console.warn("EvoLogia WARN: Ссылка 'switchToRegisterLink' не найдена."); }

    if (switchToLoginLink) {
        switchToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('login'); });
    } else { console.warn("EvoLogia WARN: Ссылка 'switchToLoginLink' не найдена."); }


    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log("EvoLogia: Событие submit формы регистрации."); // ОТЛАДОЧНЫЙ ЛОГ
            if (registerErrorP) { registerErrorP.style.display = 'none'; registerErrorP.textContent = '';}
            
            const usernameInput = document.getElementById('registerUsername');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');

            if (!usernameInput || !emailInput || !passwordInput) {
                console.error("EvoLogia ERROR: Одно или несколько полей формы регистрации не найдены!");
                if (registerErrorP) { registerErrorP.textContent = 'Ошибка формы. Обновите страницу.'; registerErrorP.style.display = 'block'; }
                return;
            }

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!username || !email || !password) {
                if (registerErrorP) { registerErrorP.textContent = 'Все поля обязательны для заполнения.'; registerErrorP.style.display = 'block'; }
                return;
            }
            if (password.length < 6) {
                if (registerErrorP) { registerErrorP.textContent = 'Пароль должен содержать не менее 6 символов.'; registerErrorP.style.display = 'block'; }
                return;
            }
            loadingIndicatorShow('Регистрация аккаунта...');
            try {
                const response = await fetch(`${backendUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await response.json();
                console.log("EvoLogia: Ответ от сервера регистрации:", data); // ОТЛАДОЧНЫЙ ЛОГ
                if (!response.ok) { throw new Error(data.error || `Ошибка сервера: ${response.status}`); }
                
                localStorage.setItem('evoUserToken', data.access_token);
                currentUser = data.user;
                alert('Регистрация успешна! Вы автоматически вошли в систему.');
                updateAuthUI();
                showView('list'); // Возвращаемся к списку статей
                // fetchAndDisplaySavedArticles(); // Можно раскомментировать, если нужно обновить список
            } catch (error) {
                console.error('EvoLogia ERROR: Ошибка регистрации:', error);
                if (registerErrorP) { registerErrorP.textContent = error.message; registerErrorP.style.display = 'block'; }
            } finally {
                loadingIndicatorHide();
            }
        });
    } else {
        console.error('EvoLogia FATAL: Форма регистрации (registerForm) НЕ НАЙДЕНА, обработчик не привязан!');
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log("EvoLogia: Событие submit формы входа."); // ОТЛАДОЧНЫЙ ЛОГ
            if (loginErrorP) { loginErrorP.style.display = 'none'; loginErrorP.textContent = ''; }

            const identifierInput = document.getElementById('loginIdentifier');
            const passwordInput = document.getElementById('loginPassword');

            if(!identifierInput || !passwordInput) {
                console.error("EvoLogia ERROR: Одно или несколько полей формы входа не найдены!");
                if (loginErrorP) { loginErrorP.textContent = 'Ошибка формы. Обновите страницу.'; loginErrorP.style.display = 'block'; }
                return;
            }
            const identifier = identifierInput.value.trim();
            const password = passwordInput.value;

            if (!identifier || !password) {
                if (loginErrorP) { loginErrorP.textContent = 'Все поля обязательны для заполнения.'; loginErrorP.style.display = 'block'; }
                return;
            }
            loadingIndicatorShow('Выполняется вход...');
            try {
                const payload = {};
                if (identifier.includes('@')) { payload.email = identifier; } 
                else { payload.username = identifier; }
                payload.password = password;

                const response = await fetch(`${backendUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                console.log("EvoLogia: Ответ от сервера входа:", data); // ОТЛАДОЧНЫЙ ЛОГ
                if (!response.ok) { throw new Error(data.error || `Ошибка сервера: ${response.status}`); }

                localStorage.setItem('evoUserToken', data.access_token);
                currentUser = data.user;
                alert('Вход успешен!');
                updateAuthUI();
                showView('list'); // Возвращаемся к списку статей
                // fetchAndDisplaySavedArticles(); 
            } catch (error) {
                console.error('EvoLogia ERROR: Ошибка входа:', error);
                if (loginErrorP) { loginErrorP.textContent = error.message; loginErrorP.style.display = 'block'; }
            } finally {
                loadingIndicatorHide();
            }
        });
    } else {
        console.error('EvoLogia FATAL: Форма входа (loginForm) НЕ НАЙДЕНА, обработчик не привязан!');
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            console.log("EvoLogia: Клик по кнопке 'Выйти'.");
            localStorage.removeItem('evoUserToken');
            currentUser = null;
            alert('Вы вышли из системы.');
            updateAuthUI();
            showView('list'); // Показываем главный вид
            // fetchAndDisplaySavedArticles(); // Можно обновить список статей, если он зависит от статуса пользователя
        });
    } else { console.warn("EvoLogia WARN: Кнопка 'logoutButton' не найдена.");}

    // --- ТВОИ СУЩЕСТВУЮЩИЕ ФУНКЦИИ ДЛЯ СТАТЕЙ И КОММЕНТАРИЕВ ---
    // (Я беру их из твоего последнего полного script.js, который ты присылал)

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
        if (authFormsSection) authFormsSection.style.display = 'none';
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
        } else if (viewName === 'auth') {
             if (authFormsSection) authFormsSection.style.display = 'block';
        }
    }

    function renderSavedArticleItem(articleData) { /* ... твой код из предыдущего script.js ... */ 
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('article-list-item'); 
        itemDiv.dataset.id = articleData.id; 
        const titleH3 = document.createElement('h3');
        titleH3.classList.add('article-list-title'); 
        titleH3.textContent = articleData.title;
        itemDiv.appendChild(titleH3);
        itemDiv.addEventListener('click', function() { displayFullArticle(articleData.id); });
        return itemDiv;
    }

    function renderCommentItem(commentData) { /* ... твой код из предыдущего script.js ... */ 
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

    async function displayFullArticle(articleId) { /* ... твой код из предыдущего script.js, с адаптацией для auth ... */
        if (!newArticleOutput || !loadingIndicator) { console.error("EvoLogia: Отсутствуют элементы DOM для displayFullArticle."); return; }
        showView('generating'); 
        loadingIndicatorShow('Загрузка статьи и комментариев...');
        newArticleOutput.innerHTML = ''; 
        try {
            const articleResponse = await fetch(`${backendUrl}/api/articles/${articleId}`);
            if (!articleResponse.ok) { throw new Error(`Ошибка загрузки статьи: ${articleResponse.status}`); }
            const fullArticleData = await articleResponse.json();
            newArticleOutput.innerHTML = `<h2>${fullArticleData.title}</h2>` + fullArticleData.content_html; 
            
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
            else if (authorNameFieldDiv) { authorNameFieldDiv.style.display = 'block';} // Показываем, если не залогинен
            
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
                    commentsListDiv.appendChild(renderCommentItem(newCommentData.comment));
                    document.getElementById('commentTextInput').value = '';
                    const authorInput = document.getElementById('commentAuthorNameInput'); if(authorInput) authorInput.value = '';
                } catch (error) { alert(`Ошибка: ${error.message}`); } 
                finally { if(submitButton) submitButton.disabled = false; }
            });
            const backButton = document.createElement('button'); backButton.id = 'evoBackToListButton';
            backButton.textContent = '‹ Назад к списку'; /* Стили кнопки из CSS */
            backButton.addEventListener('click', function() { showView('list'); });
            const hrAfter = document.createElement('hr'); hrAfter.style.marginTop = '20px';
            newArticleOutput.appendChild(hrAfter); newArticleOutput.appendChild(backButton); 
            showView('fullArticle'); 
        } catch (error) { 
            newArticleOutput.innerHTML = `<p style="color:red;">Ошибка загрузки статьи: ${error.message}</p>`;
            const backOnError = document.createElement('button'); backOnError.textContent = '‹ Назад';
            backOnError.id = 'evoBackToListButton'; // Используем тот же ID для стилей
            backOnError.onclick = () => showView('list'); newArticleOutput.appendChild(backOnError);
            showView('fullArticle');
        } finally { loadingIndicatorHide('Идет генерация статьи, пожалуйста, подождите...'); }
    }
    
    async function fetchAndDisplaySavedArticles() { /* ... твой код из предыдущего script.js ... */ 
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
        } finally { showView('list'); /* filterAndManageUI вызовется из showView */ }
    }

    function filterAndManageUI() { /* ... твой код из предыдущего script.js ... */ 
        if (!searchInput || !articleListContainer) { if (generatorControls) generatorControls.style.display = 'none'; return; }
        const filterText = searchInput.value.toLowerCase().trim();
        let visibleArticlesCount = 0;
        if (newArticleOutput && newArticleOutput.style.display !== 'block' && !newArticleOutput.querySelector('#evoPublishGeneratedArticleButton')) {
            newArticleOutput.innerHTML = '';
        }
        allSavedArticlesData.forEach(articleData => {
            const articleElement = articleListContainer.querySelector(`.article-list-item[data-id="${articleData.id}"]`);
            if (!articleElement) return; 
            const titleText = articleData.title.toLowerCase();
            let shouldBeVisible = (filterText === '' || titleText.includes(filterText));
            if (shouldBeVisible) { articleElement.style.setProperty('display', ''); visibleArticlesCount++; } 
            else { articleElement.style.setProperty('display', 'none', 'important'); }
        });
        if (noSavedArticlesMessage) {
            if (allSavedArticlesData.length === 0 && filterText === '') {
                noSavedArticlesMessage.textContent = "Сохраненных статей пока нет."; noSavedArticlesMessage.style.display = 'block';
            } else { noSavedArticlesMessage.style.display = 'none';  }
        }
        if (generatorControls && generateNewButton && noSearchResultsMessage) {
            if (savedArticlesSection && savedArticlesSection.style.display === 'block') { 
                if (filterText !== '' && visibleArticlesCount === 0) {
                    generatorControls.style.display = 'block'; noSearchResultsMessage.style.display = 'block';
                    generateNewButton.style.display = 'block'; generateNewButton.disabled = false;
                } else { generatorControls.style.display = 'none'; }
            } else { generatorControls.style.display = 'none'; }
        }
    }

    if (searchInput) { 
        searchInput.addEventListener('input', function() {
            if (newArticleOutput && newArticleOutput.style.display === 'block' && 
                !newArticleOutput.querySelector('#evoPublishGeneratedArticleButton')) {
                // Если открыта полная статья (не предпросмотр сгенерированной), и пользователь начал печатать в поиске,
                // то пока ничего не делаем, showView('list') сработает при следующем filterAndManageUI
            }
            showView('list'); 
        });
    }

    async function publishGeneratedArticle(title, contentHtml, searchQuery) { /* ... твой код из предыдущего script.js ... */ 
        const publishButton = document.getElementById('evoPublishGeneratedArticleButton');
        loadingIndicatorShow("Публикация статьи...");
        if (generateNewButton) generateNewButton.disabled = true; 
        if (publishButton) publishButton.disabled = true;
        try {
            const response = await fetch(`${backendUrl}/api/articles`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title, content_html: contentHtml, search_query: searchQuery })
            });
            if (!response.ok) { throw new Error(`Ошибка публикации: ${response.status}`); }
            alert('Статья успешно опубликована!');
            if (searchInput) searchInput.value = ''; 
            await fetchAndDisplaySavedArticles(); 
        } catch (error) {
            alert(`Не удалось опубликовать статью: ${error.message}`);
            if (generateNewButton) generateNewButton.disabled = false; 
            if(publishButton) publishButton.disabled = false; 
        } finally { loadingIndicatorHide("Идет генерация статьи, пожалуйста, подождите..."); }
    }

    if (generateNewButton) {
        generateNewButton.addEventListener('click', async function() { /* ... твой код из предыдущего script.js ... */ 
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
                if (!response.ok) { throw new Error(`Ошибка генерации: ${response.status}`); }
                const data = await response.json();
                if (newArticleOutput) {
                    newArticleOutput.innerHTML = `<h2>${userQuery}</h2>` + data.article; 
                    const publishButton = document.createElement('button');
                    publishButton.id = 'evoPublishGeneratedArticleButton';
                    publishButton.textContent = 'Опубликовать эту статью';
                    // Стили для кнопки публикации уже есть в CSS, но можно и здесь задать, если нужно переопределить
                    publishButton.addEventListener('click', function() {
                        let articleHtmlToPublish = newArticleOutput.innerHTML;
                        const buttonToRemove = newArticleOutput.querySelector('#evoPublishGeneratedArticleButton');
                        const hrToRemove = newArticleOutput.querySelector('hr.publish-separator'); // Предполагаем, что у hr есть такой класс
                        if(buttonToRemove) articleHtmlToPublish = articleHtmlToPublish.replace(buttonToRemove.outerHTML, '');
                        if(hrToRemove) articleHtmlToPublish = articleHtmlToPublish.replace(hrToRemove.outerHTML, '');
                        publishGeneratedArticle(userQuery, articleHtmlToPublish.trim(), userQuery);
                    });
                    const hrElement = document.createElement('hr'); hrElement.className = 'publish-separator'; // Даем класс для возможного удаления
                    newArticleOutput.appendChild(hrElement); newArticleOutput.appendChild(publishButton);
                }
            } catch (error) { 
                if (newArticleOutput) newArticleOutput.innerHTML = `<p style="color: red;">Ошибка: ${error.message}</p>`;
                 showView('list'); 
            } finally { loadingIndicatorHide(); filterAndManageUI(); }
        });
    }

    // --- НАЧАЛЬНАЯ ЗАГРУЗКА И ПРОВЕРКА СОСТОЯНИЯ АУТЕНТИФИКАЦИИ ---
    async function initializeApp() {
        console.log("EvoLogia: Инициализация приложения...");
        await checkAuthState(); 
        if (articleListContainer) { 
          await fetchAndDisplaySavedArticles(); 
        } else {
          showView('list'); 
          filterAndManageUI(); 
        }
        console.log("EvoLogia: Приложение инициализировано.");
    }
    initializeApp(); 
});
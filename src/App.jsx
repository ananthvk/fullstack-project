import { useEffect, useState } from 'react';
import supabase from './supabase';
import './index.css';

const CATEGORIES = [
    { name: 'technology', color: '#89b4fa' },  // Blue
    { name: 'science', color: '#a6e3a1' },     // Green
    { name: 'finance', color: '#f38ba8' },     // Red
    { name: 'society', color: '#f9e2af' },     // Yellow
    { name: 'entertainment', color: '#f5c2e7' }, // Pink
    { name: 'health', color: '#94e2d5' },      // Teal
    { name: 'history', color: '#fab387' },     // Peach
    { name: 'news', color: '#cba6f7' },        // Mauve
];

function App() {
    const [showForm, setShowForm] = useState(false);
    const [facts, setFacts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentCategory, setCurrentCategory] = useState('all');
    const [sortBy, setSortBy] = useState('votesInteresting');
    const [user, setUser] = useState(null);
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(
        function () {
            async function getFacts() {
                setIsLoading(true);

                let query = supabase.from('facts').select('*');

                if (currentCategory !== 'all')
                    query = query.eq('category', currentCategory);

                query = query.order(sortBy === 'created_at' ? 'created_at' : sortBy, { ascending: false });

                const { data: facts, error } = await query;
                if (!error) setFacts(facts);
                else alert('There was a problem getting data');
                setIsLoading(false);
            }
            getFacts();
        },
        [currentCategory, sortBy]
    );

    return (
        <>
            <Header 
                showForm={showForm} 
                setShowForm={setShowForm} 
                user={user}
                setShowAuth={setShowAuth}
            />

            {showAuth && <AuthForm setShowAuth={setShowAuth} />}

            <div className="sort-buttons">
                <button className='btn btn-sort' onClick={() => setSortBy('votesInteresting')}>
                    🔥 Most Upvoted
                </button>
                <button className='btn btn-sort' onClick={() => setSortBy('created_at')}>
                    🕒 Most Recent
                </button>
                <button className='btn btn-sort' onClick={() => setSortBy('votesMindblowing')}>
                    🤯 Most Mind-Blowing
                </button>
                <button className='btn btn-sort' onClick={() => setSortBy('votesFalse')}>
                    🛑 Most False
                </button>
            </div>
            {showForm && user && (
                <NewFactForm setFacts={setFacts} setShowForm={setShowForm} />
            )}
            <main className='main'>
                <CategoryFilter setCurrentCategory={setCurrentCategory} />
                {(isLoading && <Loader />) || (
                    <FactList facts={facts} setFacts={setFacts} />
                )}
            </main>
        </>
    );
}

function AuthForm({ setShowAuth }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
            
            // If we get here, authentication was successful
            setShowAuth(false);
        } catch (error) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="auth-form-container">
            <button 
                className="btn-close" 
                onClick={() => setShowAuth(false)}
                disabled={isLoading}
            >
                ✕
            </button>
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>{isSignUp ? 'Sign Up' : 'Login'}</h2>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                />
                <button className="btn btn-large" disabled={isLoading}>
                    {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
                </button>
                <button
                    type="button"
                    className="btn btn-large btn-link"
                    onClick={() => setIsSignUp(!isSignUp)}
                >
                    {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
                </button>
            </form>
        </div>
    );
}

function Loader() {
    return <p className='message'>Loading...</p>;
}

function Header({ showForm, setShowForm, user, setShowAuth }) {
    const appTitle = 'Today I learned!';

    return (
        <header className='header'>
            <div className='logo'>
                <img src='logo.png' alt='Today I learned logo' />
                <h1>{appTitle}</h1>
            </div>
            {user ? (
                <div className="user-info">
                    <span>Welcome, {user.email}</span>
                    <button
                        className='btn btn-large btn-open'
                        onClick={() => setShowForm(showForm => !showForm)}>
                        {showForm ? 'close' : 'Share a fact'}
                    </button>
                    <button
                        className='btn btn-large btn-logout'
                        onClick={() => supabase.auth.signOut()}>
                        Logout
                    </button>
                </div>
            ) : (
                <button
                    className='btn btn-large btn-open'
                    onClick={() => setShowAuth(true)}>
                    Login
                </button>
            )}
        </header>
    );
}

function isValidHttpUrl(string) {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === 'http:' || url.protocol === 'https:';
}

function NewFactForm({ setFacts, setShowForm }) {
    const [text, setText] = useState('');
    const [source, setSource] = useState('');
    const [category, setCategory] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const textLength = text.length;

    async function handleSubmit(e) {
        // 1. Prevent browser reload
        e.preventDefault();

        // 2. Check if data is valid. If so, create a new fact
        if (!text || !isValidHttpUrl(source) || !category || textLength > 200)
            return;

        // 3. Create a new fact object
        // const newFact = {
        //   id: Math.trunc(Math.random() * 10000000),
        //   text,
        //   source,
        //   category,
        //   votesInteresting: 0,
        //   votesMindblowing: 0,
        //   votesFalse: 0,
        //   created_at: new Date(),
        // };

        // 3. Upload fact to supabase and receive the new fact object
        setIsUploading(true);
        const { data: newFact, error } = await supabase
            .from('facts')
            .insert([{ text, source, category }])
            .select();
        setIsUploading(false);

        // 4. Add the new fact to the UI: add the fact to state
        if (!error) setFacts(facts => [newFact[0], ...facts]);

        // 5. Reset input fields
        setText('');
        setSource('');
        setCategory('');

        // 6. Close the form
        // setShowForm(false);
    }

    return (
        <form className='fact-form' onSubmit={handleSubmit}>
            <input
                type='text'
                placeholder='Share a fact with the world...'
                value={text}
                onChange={e => e.target.value.length <= 200 && setText(e.target.value)}
                disabled={isUploading}
            />
            <span>{200 - textLength}</span>
            <input
                type='text'
                placeholder='Trustworthy source...'
                value={source}
                onChange={e => setSource(e.target.value)}
                disabled={isUploading}
            />
            <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={isUploading}>
                <option value=''>Choose category:</option>
                {CATEGORIES.map(cat => (
                    <option key={cat.name} value={cat.name}>
                        {cat.name[0].toUpperCase() + cat.name.slice(1)}
                    </option>
                ))}
            </select>
            <button className='btn btn-large btn-post' disabled={isUploading}>
                Post
            </button>
        </form>
    );
}

function CategoryFilter({ setCurrentCategory }) {
    return (
        <aside>
            <ul>
                <li className='category'>
                    <button
                        className='btn btn-all-categories'
                        onClick={() => setCurrentCategory('all')}>
                        All
                    </button>
                </li>
                {CATEGORIES.map(cat => (
                    <li key={cat.name} className='category'>
                        <button
                            className='btn btn-category'
                            onClick={() => setCurrentCategory(cat.name)}
                            style={{ backgroundColor: cat.color }}>
                            {cat.name}
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
}

function FactList({ facts, setFacts }) {
    if (facts.length === 0)
        return (
            <p className='message'>
                No facts for this category yet! Create the first one.
            </p>
        );

    return (
        <section>
            <ul className='facts-list'>
                {facts.map(fact => (
                    <Fact key={fact.id} fact={fact} setFacts={setFacts} />
                ))}
            </ul>
            <p>There are {facts.length} facts in the database. Add your own!</p>
        </section>
    );
}

function Fact({ fact, setFacts }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const isDisputed =
        fact.votesInteresting + fact.votesMindblowing < fact.votesFalse;

    async function handleVote(columnName) {
        setIsUpdating(true);
        const { data: updatedFact, error } = await supabase
            .from('facts')
            .update({ [columnName]: fact[columnName] + 1 })
            .eq('id', fact.id)
            .select();
        setIsUpdating(false);

        if (!error)
            setFacts(facts =>
                facts.map(f => (f.id === fact.id ? updatedFact[0] : f))
            );
    }

    return (
        <li className='fact'>
            <p>
                {isDisputed && <span className='disputed'>[⛔ DISPUTED]</span>}
                {fact.text}
                <a className='source' href={fact.source} target='_blank'>
                    (Source)
                </a>
            </p>
            <span
                className='tag'
                style={{
                    backgroundColor: `${CATEGORIES.find(cat => cat.name === fact.category).color
                        }`,
                }}>
                {fact.category}
            </span>
            <div className='vote-buttons'>
                <button
                    onClick={() => handleVote('votesInteresting')}
                    disabled={isUpdating}>
                    {fact.votesInteresting} 👍
                </button>
                <button
                    onClick={() => handleVote('votesMindblowing')}
                    disabled={isUpdating}>
                    {fact.votesMindblowing} 🤯
                </button>
                <button onClick={() => handleVote('votesFalse')} disabled={isUpdating}>
                    {fact.votesFalse} ⛔️
                </button>
            </div>
        </li>
    );
}

export default App;

import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { STATIC_VOCABULARY, STATIC_QUIZZES } from '../services/geminiService';

interface AdminPanelProps {
  onBack: () => void;
}

interface UserData {
  id: string;
  email: string;
  role: string;
  totalScore: number;
  streak: number;
  badgesCount: number;
  quizzesCompleted: number;
  spellingCompleted: number;
  sentencesCompleted: number;
  memoryCompleted: number;
}

type AdminTab = 'users' | 'words' | 'quizzes' | 'memory';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  // JSON States for DB management
  const [vocabularyJson, setVocabularyJson] = useState('');
  const [quizzesJson, setQuizzesJson] = useState('');
  const [saveStatus, setSaveStatus] = useState<{status: 'idle' | 'saving' | 'success' | 'error', msg: string}>({status: 'idle', msg: ''});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersList: UserData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        usersList.push({
          id: doc.id,
          email: data.email || 'No email',
          role: data.role || 'user',
          totalScore: data.totalScore || 0,
          streak: data.streak || 0,
          badgesCount: data.badges ? data.badges.length : 0,
          quizzesCompleted: data.quizzesCompleted || 0,
          spellingCompleted: data.spellingCompleted || 0,
          sentencesCompleted: data.sentencesCompleted || 0,
          memoryCompleted: data.memoryCompleted || 0,
        });
      });
      setUsers(usersList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async (type: 'vocabulary' | 'quizzes') => {
    try {
      const docRef = doc(db, 'content', type);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        if (type === 'vocabulary') setVocabularyJson(JSON.stringify(docSnap.data(), null, 2));
        if (type === 'quizzes') setQuizzesJson(JSON.stringify(docSnap.data(), null, 2));
      } else {
        // Load fallback if no DB sync yet
        if (type === 'vocabulary') setVocabularyJson(JSON.stringify(STATIC_VOCABULARY, null, 2));
        if (type === 'quizzes') setQuizzesJson(JSON.stringify(STATIC_QUIZZES, null, 2));
      }
    } catch (e) {
      console.error('Fetch content error', e);
      if (type === 'vocabulary') setVocabularyJson(JSON.stringify(STATIC_VOCABULARY, null, 2));
      if (type === 'quizzes') setQuizzesJson(JSON.stringify(STATIC_QUIZZES, null, 2));
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'words' || activeTab === 'memory') fetchContent('vocabulary');
    if (activeTab === 'quizzes') fetchContent('quizzes');
    setSaveStatus({status: 'idle', msg: ''});
  }, [activeTab]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user data?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      fetchUsers();
    } catch (e) {
      alert('Error deleting user');
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      await updateDoc(doc(db, 'users', editUser.id), {
        role: editUser.role,
        email: editUser.email,
        totalScore: editUser.totalScore
      });
      setEditUser(null);
      fetchUsers();
    } catch (e) {
      alert('Error updating user');
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail) return;
    try {
      const newId = 'manual_' + Date.now().toString();
      await setDoc(doc(db, 'users', newId), {
        email: newUserEmail,
        role: newUserRole,
        totalScore: 0,
        badges: [],
        streak: 0,
        quizzesCompleted: 0,
        spellingCompleted: 0,
        sentencesCompleted: 0,
        memoryCompleted: 0,
        lastActiveDate: new Date().toISOString().split('T')[0]
      });
      setIsAdding(false);
      setNewUserEmail('');
      setNewUserRole('user');
      fetchUsers();
    } catch (e) {
      alert('Error adding user. Creating auth users requires backend, this creates DB entry only.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSaveContent = async (type: 'vocabulary' | 'quizzes') => {
    setSaveStatus({status: 'saving', msg: 'Saving changes...'});
    try {
      let parsedData;
      if (type === 'vocabulary') parsedData = JSON.parse(vocabularyJson);
      if (type === 'quizzes') parsedData = JSON.parse(quizzesJson);
      
      await setDoc(doc(db, 'content', type), parsedData);
      setSaveStatus({status: 'success', msg: 'Changes saved successfully to users!'});
      setTimeout(() => setSaveStatus({status: 'idle', msg: ''}), 3000);
    } catch (e: any) {
      setSaveStatus({status: 'error', msg: `Error saving: ${e.message || 'Invalid JSON'}`});
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10 shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-black uppercase text-amber-400">Admin Portal</h2>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">K-Learn System</p>
        </div>
        <nav className="flex-1 mt-6">
          <ul className="space-y-2 px-4">
            <li>
              <button 
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${activeTab === 'users' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <i className="fas fa-users w-5"></i> Learners
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('words')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${activeTab === 'words' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <i className="fas fa-book w-5"></i> Kadazan Words
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('quizzes')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${activeTab === 'quizzes' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <i className="fas fa-question-circle w-5"></i> Quiz Questions
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('memory')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${activeTab === 'memory' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <i className="fas fa-gamepad w-5"></i> Memory Games
              </button>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={onBack}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-slate-300 mb-2 hover:bg-slate-800 flex items-center gap-3"
          >
            <i className="fas fa-arrow-left w-5"></i> Back to App
          </button>
          <button 
             onClick={handleLogout}
             className="w-full text-left px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-900/30 flex items-center gap-3 transition-colors"
          >
            <i className="fas fa-sign-out-alt w-5"></i> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <h1 className="text-3xl font-black text-slate-800 mb-8 capitalize flex items-center justify-between">
          <span>{activeTab === 'memory' ? '(Memory Game utilizes Kadazan Words)' : activeTab + ' Management'}</span>
        </h1>

        {activeTab === 'users' && (
          <div className="bg-white rounded-[2rem] border-4 border-slate-900 shadow-xl p-6 lg:p-8">
            <div className="flex justify-between items-center pb-6 border-b-4 border-slate-100 mb-6">
              <h3 className="text-2xl font-black text-slate-800">Registered Users</h3>
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-5 py-3 bg-amber-400 border-2 border-slate-900 rounded-xl font-bold uppercase hover:bg-amber-500 transition"
              >
                <i className="fas fa-plus"></i> Add User
              </button>
            </div>

            {isAdding && (
              <div className="mb-8 p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                <h4 className="font-bold text-lg mb-4">Add New System User</h4>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                    <input 
                      type="email" 
                      value={newUserEmail} 
                      onChange={e => setNewUserEmail(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role</label>
                    <select 
                      value={newUserRole} 
                      onChange={e => setNewUserRole(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleAddUser}
                    className="px-6 py-2 md:py-2.5 bg-red-600 text-white font-bold uppercase rounded-xl hover:bg-red-700"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-2 md:py-2.5 bg-slate-200 text-slate-700 font-bold uppercase rounded-xl hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {editUser && (
              <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                <h4 className="font-bold text-lg mb-4">Edit User: {editUser.email}</h4>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                    <input 
                      type="email" 
                      value={editUser.email} 
                      onChange={e => setEditUser({...editUser, email: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role</label>
                    <select 
                      value={editUser.role} 
                      onChange={e => setEditUser({...editUser, role: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Score</label>
                    <input 
                      type="number" 
                      value={editUser.totalScore} 
                      onChange={e => setEditUser({...editUser, totalScore: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={handleUpdate}
                    className="px-6 py-2 md:py-2.5 bg-emerald-600 text-white font-bold uppercase rounded-xl hover:bg-emerald-700"
                  >
                    Update
                  </button>
                  <button 
                    onClick={() => setEditUser(null)}
                    className="px-6 py-2 md:py-2.5 bg-slate-200 text-slate-700 font-bold uppercase rounded-xl hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="p-4 font-black uppercase text-xs text-slate-500 bg-slate-50">Email</th>
                      <th className="p-4 font-black uppercase text-xs text-slate-500 bg-slate-50">Role</th>
                      <th className="p-4 font-black uppercase text-xs text-slate-500 bg-slate-50">Score</th>
                      <th className="p-4 font-black uppercase text-xs text-slate-500 bg-slate-50">Progress</th>
                      <th className="p-4 font-black uppercase text-xs text-slate-500 bg-slate-50 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-800">{u.email}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-600">{u.totalScore}</td>
                        <td className="p-4">
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <span className="text-slate-500"><i className="fas fa-fire text-orange-500 w-4"></i> {u.streak}</span>
                            <span className="text-slate-500"><i className="fas fa-award text-amber-500 w-4"></i> {u.badgesCount}</span>
                            <span className="text-slate-500"><i className="fas fa-question-circle text-blue-500 w-4"></i> {u.quizzesCompleted}</span>
                            <span className="text-slate-500"><i className="fas fa-keyboard text-emerald-500 w-4"></i> {u.spellingCompleted}</span>
                            <span className="text-slate-500"><i className="fas fa-pen text-indigo-500 w-4"></i> {u.sentencesCompleted}</span>
                            <span className="text-slate-500"><i className="fas fa-gamepad text-purple-500 w-4"></i> {u.memoryCompleted}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right flex flex-col justify-end gap-2 items-end">
                           <div className="flex gap-2">
                             <button 
                                onClick={() => setEditUser(u)}
                                className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition"
                             >
                               <i className="fas fa-edit"></i>
                             </button>
                             <button 
                                onClick={() => handleDelete(u.id)}
                                className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition"
                             >
                               <i className="fas fa-trash"></i>
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {(activeTab === 'words' || activeTab === 'memory') && (
          <div className="bg-white rounded-[2rem] border-4 border-slate-900 shadow-xl p-8 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4">
               <div>
                 <h3 className="text-xl font-black text-slate-800">Kadazan Vocabulary & Memory Games Database</h3>
                 <p className="text-sm font-bold text-slate-500 mt-1">Edit the JSON object below to update words. Memory games will automatically use these words.</p>
               </div>
               <button 
                 onClick={() => handleSaveContent('vocabulary')}
                 disabled={saveStatus.status === 'saving'}
                 className="px-6 py-3 bg-emerald-500 text-white font-black uppercase rounded-xl hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-1 transition-all"
               >
                 <i className="fas fa-save mr-2"></i> Save Changes to App
               </button>
            </div>
            
            {saveStatus.status !== 'idle' && (
              <div className={`w-full p-4 mb-4 rounded-xl font-bold ${saveStatus.status === 'success' ? 'bg-emerald-100 text-emerald-800' : saveStatus.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                {saveStatus.msg}
              </div>
            )}
            
            <textarea 
               value={vocabularyJson}
               onChange={(e) => setVocabularyJson(e.target.value)}
               className="w-full h-[500px] font-mono text-sm p-4 bg-slate-900 text-emerald-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-400"
               spellCheck="false"
            />
          </div>
        )}
        
        {activeTab === 'quizzes' && (
          <div className="bg-white rounded-[2rem] border-4 border-slate-900 shadow-xl p-8 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4">
               <div>
                 <h3 className="text-xl font-black text-slate-800">Quiz Questions Database</h3>
                 <p className="text-sm font-bold text-slate-500 mt-1">Edit the JSON object below to update quiz questions and options.</p>
               </div>
               <button 
                 onClick={() => handleSaveContent('quizzes')}
                 disabled={saveStatus.status === 'saving'}
                 className="px-6 py-3 bg-emerald-500 text-white font-black uppercase rounded-xl hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-1 transition-all"
               >
                 <i className="fas fa-save mr-2"></i> Save Changes to App
               </button>
            </div>
            
            {saveStatus.status !== 'idle' && (
              <div className={`w-full p-4 mb-4 rounded-xl font-bold ${saveStatus.status === 'success' ? 'bg-emerald-100 text-emerald-800' : saveStatus.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                {saveStatus.msg}
              </div>
            )}
            
            <textarea 
               value={quizzesJson}
               onChange={(e) => setQuizzesJson(e.target.value)}
               className="w-full h-[500px] font-mono text-sm p-4 bg-slate-900 text-emerald-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-400"
               spellCheck="false"
            />
          </div>
        )}
      </div>
    </div>
  );
};


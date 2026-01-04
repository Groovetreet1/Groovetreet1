import React from 'react';

const ThankYouPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-purple-900/20 to-slate-900"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,_var(--tw-gradient-stops))] from-transparent via-purple-900/10 to-transparent animate-spin" style={{ animationDuration: '30s' }}></div>
      </div>
      
      {/* Floating Particles with enhanced 3D effects */}
      {Array.from({ length: 100 }).map((_, i) => {
        const size = Math.random() * 6 + 2;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const duration = Math.random() * 15 + 5;
        const delay = Math.random() * 5;
        return (
          <div
            key={i}
            className="absolute rounded-full opacity-40"
            style={{
              left: `${posX}%`,
              top: `${posY}%`,
              width: `${size}px`,
              height: `${size}px`,
              background: `radial-gradient(circle, ${['#a855f7', '#ec4899', '#3b82f6'][Math.floor(Math.random() * 3)]}, transparent)` ,
              animation: `float3d ${duration}s ease-in-out ${delay}s infinite alternate`,
              transform: `translateZ(${Math.random() * 20}px)`,
            }}
          />
        );
      })}
      
      {/* Floating geometric shapes */}
      {Array.from({ length: 15 }).map((_, i) => {
        const size = Math.random() * 20 + 10;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        const shape = ['square', 'triangle', 'diamond'][Math.floor(Math.random() * 3)];
        
        let shapeClass = 'absolute opacity-20 ';
        if (shape === 'square') shapeClass += 'rotate-square';
        else if (shape === 'triangle') shapeClass += 'rotate-triangle';
        else shapeClass += 'rotate-diamond';
        
        return (
          <div
            key={`shape-${i}`}
            className={shapeClass}
            style={{
              left: `${posX}%`,
              top: `${posY}%`,
              width: `${size}px`,
              height: `${size}px`,
              background: `conic-gradient(from ${Math.random() * 360}deg, #a855f7, #ec4899, #3b82f6, #a855f7)` ,
              animation: `rotate3d ${duration}s linear ${delay}s infinite`,
              clipPath: shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 
                       shape === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none',
              transform: `translateZ(${Math.random() * 30 + 10}px)`,
            }}
          />
        );
      })}
      
      <div className="relative z-10 text-center px-4">
        {/* Main 3D Title with enhanced effects */}
        <div className="relative mb-12" style={{ transformStyle: 'preserve-3d' }}>
          <h1 
            className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-4"
            style={{
              textShadow: '0 0 30px rgba(168, 85, 247, 0.5), 0 0 60px rgba(236, 72, 153, 0.3), 0 0 80px rgba(59, 130, 246, 0.4)',
              transform: 'perspective(1000px) rotateX(20deg) rotateY(10deg) translateZ(30px)',
              animation: 'float3d 3s ease-in-out infinite alternate, glow 2s ease-in-out infinite alternate',
              transformStyle: 'preserve-3d',
            }}
          >
            MERCI
          </h1>
          {/* Multiple depth layers for 3D effect */}
          <div 
            className="absolute inset-0 text-6xl md:text-8xl font-bold text-slate-700 opacity-30 -z-10"
            style={{
              transform: 'perspective(1000px) rotateX(20deg) rotateY(10deg) translateZ(10px)',
              transformStyle: 'preserve-3d',
            }}
          >
            MERCI
          </div>
          <div 
            className="absolute inset-0 text-6xl md:text-8xl font-bold text-slate-900 opacity-20 -z-20"
            style={{
              transform: 'perspective(1000px) rotateX(20deg) rotateY(10deg) translateZ(-10px)',
              transformStyle: 'preserve-3d',
            }}
          >
            MERCI
          </div>
        </div>

        {/* Subtitle */}
        <p 
          className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed"
          style={{
            transform: 'perspective(500px) rotateX(10deg)',
          }}
        >
          Pour votre confiance et votre soutien continu
        </p>

        {/* 3D Floating Cards with enhanced depth */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12" style={{ transformStyle: 'preserve-3d' }}>
          {[
            { title: "Travail", desc: "Excellent", icon: "💼", color: "from-blue-500 to-cyan-500" },
            { title: "Equipe", desc: "Professionnelle", icon: "👥", color: "from-purple-500 to-pink-500" },
            { title: "Resultat", desc: "Exceptionnel", icon: "🏆", color: "from-emerald-500 to-teal-500" }
          ].map((item, index) => (
            <div
              key={index}
              className={`relative p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 transform-gpu hover:scale-105 transition-all duration-300 ${
                index === 0 ? 'hover:-translate-y-3' : index === 1 ? 'hover:-translate-y-2' : 'hover:-translate-y-3'
              }`}
              style={{
                transform: `perspective(1000px) rotateX(10deg) rotateY(${index === 1 ? 0 : index === 0 ? -5 : 5}deg) translateZ(20px)`,
                animation: `float3d 4s ease-in-out ${index * 0.7}s infinite alternate, float 6s ease-in-out ${index * 0.3}s infinite alternate`,
                transformStyle: 'preserve-3d',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-2xl opacity-10 -z-10`} />
              <div 
                className="text-4xl mb-4"
                style={{
                  transform: 'translateZ(30px)',
                  filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                }}
              >
                {item.icon}
              </div>
              <h3 
                className="text-lg font-semibold text-white mb-2"
                style={{
                  transform: 'translateZ(25px)',
                }}
              >
                {item.title}
              </h3>
              <p 
                className="text-slate-400"
                style={{
                  transform: 'translateZ(20px)',
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* 3D Celebration Elements */}
        <div className="relative">
          <div className="flex justify-center space-x-8">
            {['🎉', '✨', '🎊', '🎁', '💫'].map((emoji, index) => (
              <div
                key={index}
                className="text-4xl animate-bounce"
                style={{
                  animationDelay: `${index * 0.2}s`,
                  animationDuration: '2s',
                }}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Custom CSS for advanced 3D animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes float3d {
          0% { transform: translateY(0) translateZ(0) rotateX(0) rotateY(0); }
          25% { transform: translateY(-15px) translateZ(10px) rotateX(5deg) rotateY(5deg); }
          50% { transform: translateY(0) translateZ(5px) rotateX(0) rotateY(-5deg); }
          75% { transform: translateY(-10px) translateZ(15px) rotateX(-5deg) rotateY(0); }
          100% { transform: translateY(0) translateZ(0) rotateX(0) rotateY(0); }
        }
        
        @keyframes glow {
          0% { text-shadow: 0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(236, 72, 153, 0.3); }
          100% { text-shadow: 0 0 40px rgba(168, 85, 247, 0.8), 0 0 80px rgba(236, 72, 153, 0.6); }
        }
        
        @keyframes rotate3d {
          0% { transform: rotateX(0) rotateY(0) rotateZ(0); }
          100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
        }
        
        @keyframes pulse3d {
          0%, 100% { transform: scale3d(1, 1, 1); }
          50% { transform: scale3d(1.05, 1.05, 1.05); }
        }
        
        .rotate-square {
          transform-style: preserve-3d;
        }
        
        .rotate-triangle {
          transform-style: preserve-3d;
        }
        
        .rotate-diamond {
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
};

export default ThankYouPage;
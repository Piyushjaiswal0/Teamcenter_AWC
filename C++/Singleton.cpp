#include <iostream>
#include <string>

using namespace std;

class Singleton
{
private:
    static Singleton *object;

    Singleton()
    {
        cout << "Constructor called" << endl;
    }
    
    Singleton(Singleton &obj)
    {
        cout << "Copy constructor called" << endl;
    }

    Singleton operator=(Singleton &obj)
    {
        cout << "assignment operator" << endl;
    }

    public:
    static Singleton * getInstance(){
        if (!object){
            object = new Singleton;
        }
        else {
            return object;
        }
    }

    void print(string value){
        cout << value << endl;
    }
};

Singleton *Singleton::object = nullptr;

void test(){
    Singleton * obj = Singleton::getInstance();
    obj->print("aag hai");
}

int main(){
    Singleton * obj = Singleton::getInstance();
    obj->print("Vicks");
    test();
    return 0;
}
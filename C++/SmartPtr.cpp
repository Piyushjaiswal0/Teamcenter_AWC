#include <iostream>

using namespace std;

class SmartPrt{
    private:
        int* ptr;
    
    public:
        SmartPrt(){
            ptr = new int;
            cout << "Constructor Called" << endl;
        }

        ~SmartPrt(){
            delete ptr;
            cout << "Destructor Called" << endl;
        }

        int& usePtr(){
            return *ptr;
        }
};

int main(){
    {
        SmartPrt intPtr;
        intPtr.usePtr() = 20;
        cout << "value :" << intPtr.usePtr() << endl;
    }
}